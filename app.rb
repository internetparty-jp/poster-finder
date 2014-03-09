require 'sinatra'
require "sinatra/reloader" if development?
require 'haml'
require 'twitter'
require 'faraday'
require 'omniauth'
require 'open-uri'
require 'redis'
require 'json'
require 'pp'

REDISTOGO_URL           = ENV["REDISTOGO_URL"]
TWITTER_CONSUMER_KEY    = ENV['TWITTER_CONSUMER_KEY']
TWITTER_CONSUMER_SECRET = ENV['TWITTER_CONSUMER_SECRET']
TWITTER_ACCESS_TOKEN    = ENV['TWITTER_ACCESS_TOKEN']
TWITTER_ACCESS_SECRET   = ENV['TWITTER_ACCESS_SECRET']
SHIRASETE_API_KEY       = ENV['SHIRASETE_API_KEY']
SHIRASETE_PROJECT_ID = ENV['SHIRASETE_PROJECT_ID']

DIGGING_TWEETS_PER_USER = 1500

SHIRASETE_BASE_URL = "http://beta.shirasete.jp/"
SHIRASETE_CATEGORIES = URI.join(SHIRASETE_BASE_URL, "/projects/#{SHIRASETE_PROJECT_ID}/issue_categories.json?key=#{SHIRASETE_API_KEY}")

REDIS_KEY = 'posterfinder:favorites'

configure do
  use Rack::Auth::Basic do |username, password|
    username == ENV['BASIC_AUTH_USERNAME'] && password == ENV['BASIC_AUTH_PASSWORD']
  end

  enable :sessions
  set :session_secret, 'aeiha3889aow'
  enable :sessions, :logging

  if REDISTOGO_URL 
    uri = URI.parse(REDISTOGO_URL)
    redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
  else
    redis = Redis.new
  end
  set :redis, redis

  use OmniAuth::Builder do
    provider :twitter, TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET
  end

  client = Twitter::REST::Client.new do |config|
    config.consumer_key        = TWITTER_CONSUMER_KEY
    config.consumer_secret     = TWITTER_CONSUMER_SECRET
    config.access_token        = TWITTER_ACCESS_TOKEN
    config.access_token_secret = TWITTER_ACCESS_SECRET
  end
  set :twitter_client, client
  
  conn = Faraday::Connection.new(:url => SHIRASETE_BASE_URL) do |builder|
    builder.use Faraday::Request::UrlEncoded  # リクエストパラメータを URL エンコードする
    builder.use Faraday::Response::Logger     # リクエストを標準出力に出力する
    builder.use Faraday::Adapter::NetHttp     # Net/HTTP をアダプターに使う
  end
  set :faraday, conn

  mime_type :json, 'application/json'
end

get '/' do
  if session[:user_twitter_access_token] and session[:user_twitter_access_token_secret]
    haml :index, :layout => nil
  else
    redirect '/auth/twitter'
  end
end

get '/auth/:name/callback' do
  auth = request.env["omniauth.auth"]
  session[:user_twitter_access_token] = auth.credentials.token
  session[:user_twitter_access_token_secret] = auth.credentials.secret
  redirect '/'
end

get '/categories.json' do
  content_type :json
  open(SHIRASETE_CATEGORIES).read
end

get '/issues.json' do
  content_type :json
  category_id = params[:category_id]
  p category_id
  offset = 0
  limit = 100

  issues = []

  loop do
    shirasete_issues_url = "http://beta.shirasete.jp/issues.json?project_id=#{SHIRASETE_PROJECT_ID}&category_id=#{category_id}&sort=updated_on:desc&offset=#{offset}&limit=#{limit}&key=#{SHIRASETE_API_KEY}"
    p shirasete_issues_url
    json = open(shirasete_issues_url).read
    result = JSON.parse(json)
    _issues = result['issues']
    issues += _issues
    break if _issues.size <= 0
    offset = issues.count
    puts "offset: #{offset}"
  end

  issues.to_json
end

put '/issues/:id.json' do
  content_type :json
  id = params[:id]
  notes = params[:notes]
  status_id = 5
  conn = settings.faraday
  conn.put do |req|
    req.url "/issues/#{id}.json"
    req.headers['Content-Type'] = 'application/json'
    req.params = {:key => SHIRASETE_API_KEY}
    req.body = {
      :issue => {
        :notes => notes,
        :status_id => status_id
      }
    }.to_json
  end
  {}.to_json
end

get '/tweets.json' do
  redis = settings.redis
  filter_text = params[:filter_text]
  screen_name = params[:screen_name]
  max_id = params[:max_id]
  puts "max_id: #{max_id}"
  puts "filter_text: #{filter_text}"
  puts "screen_name: #{screen_name}"
  client = Twitter::REST::Client.new do |config|
    config.consumer_key        = TWITTER_CONSUMER_KEY
    config.consumer_secret     = TWITTER_CONSUMER_SECRET
    config.access_token        = session[:user_twitter_access_token]
    config.access_token_secret = session[:user_twitter_access_token_secret]
  end
  #client = settings.twitter_client
  options = {:count => 100}
  if max_id
    options[:max_id] = max_id.to_i - 1
  end
  tweets = []
  if screen_name
    tweet_objects = []
    loop do
      options[:max_id] = tweet_objects.last.id.to_i-1 if tweet_objects.count > 0
      _tweet_objects = client.user_timeline(screen_name, options)
      #pp _tweet_objects
      p _tweet_objects.count
      break if _tweet_objects.count <= 0
      tweet_objects += _tweet_objects
      break if tweet_objects.count > DIGGING_TWEETS_PER_USER
    end
    tweet_objects.each do |tweet|
      if tweet.text =~ /posterdone/ or tweet.text =~ /#家入ポスター貼ってるってよ/
        if tweet.favorited
          redis.hset(REDIS_KEY, tweet.id.to_s, true)
        elsif !redis.hget(REDIS_KEY, tweet.id.to_s)
          t = {:id => tweet.id.to_s, :uri => tweet.uri, :text => tweet.text, :favorited => tweet.favorited}
          if tweet.media[0]
            t[:photo_uri] = tweet.media[0].media_uri.to_s
          end
          tweets << t
        end # if
      end # if
    end
    #pp tweets
  else
    client.search("posterdone #{filter_text}", options).each do |tweet|
      if !redis.hget(REDIS_KEY, tweet.id.to_s)
        t = {:id => tweet.id.to_s, :uri => tweet.uri, :text => tweet.text, :favorited => tweet.favorited}
        if tweet.media[0]
          t[:photo_uri] = tweet.media[0].media_uri.to_s
        end
        tweets << t
      end
    end
  end
  content_type :json
  tweets.to_json
end

# @posterdone のフォロワー一覧を取得する
get '/followers.json' do
  client = Twitter::REST::Client.new do |config|
    config.consumer_key        = TWITTER_CONSUMER_KEY
    config.consumer_secret     = TWITTER_CONSUMER_SECRET
    config.access_token        = session[:user_twitter_access_token]
    config.access_token_secret = session[:user_twitter_access_token_secret]
  end
  #client = settings.twitter_client
  followers = client.followers('posterdone').to_a
  followers.reject!{|f| f.protected}
  followers = followers.map{|f| f.screen_name}
  p followers.size
  content_type :json
  followers.to_json
end

get '/favorites.json' do
  redis = settings.redis
  all_favs = redis.hkeys(REDIS_KEY)
  content_type :json
  all_favs.to_json
end

# ツィートをふぁぼってRedisに記録する
# ふぁぼに失敗した場合は無視
post '/favorite.json' do
  redis = settings.redis
  tweet_uri = params[:tweet_uri]
  tweet_id = params[:tweet_id]
  #redis.hset(REDIS_KEY, tweet_id, true)
  puts "tweet_id: #{tweet_id}"
  content_type :json
  client = settings.twitter_client
  begin
    ts = client.favorite(tweet_uri)
    p tweet_uri
    p tweet_id
    p ts
    #if t = ts.first
    #end
  rescue => e
    puts "#{tweet_id}: #{e}"
  end
  redis.hset(REDIS_KEY, tweet_id, true)
  puts "hget: #{redis.hget(REDIS_KEY, tweet_id)}"
  {}.to_json
end

