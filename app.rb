require 'sinatra'
require "sinatra/reloader" if development?
require 'haml'
require 'twitter'
require 'faraday'
require 'omniauth'
require 'open-uri'
require 'json'
require 'pp'

TWITTER_CONSUMER_KEY    = ENV['TWITTER_CONSUMER_KEY']
TWITTER_CONSUMER_SECRET = ENV['TWITTER_CONSUMER_SECRET']
TWITTER_ACCESS_TOKEN    = ENV['TWITTER_ACCESS_TOKEN']
TWITTER_ACCESS_SECRET   = ENV['TWITTER_ACCESS_SECRET']
SHIRASETE_API_KEY       = ENV['SHIRASETE_API_KEY']
SHIRASETE_PROJECT_ID = ENV['SHIRASETE_PROJECT_ID']

SHIRASETE_BASE_URL = "http://beta.shirasete.jp/"
SHIRASETE_CATEGORIES = URI.join(SHIRASETE_BASE_URL, "/projects/#{SHIRASETE_PROJECT_ID}/issue_categories.json?key=#{SHIRASETE_API_KEY}")

configure do
  use Rack::Auth::Basic do |username, password|
    username == ENV['BASIC_AUTH_USERNAME'] && password == ENV['BASIC_AUTH_PASSWORD']
  end

  enable :sessions
  set :session_secret, 'aeiha3889aow'
  enable :sessions, :logging

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
  content_type :json
  filter_text = params[:filter_text];
  client = Twitter::REST::Client.new do |config|
    config.consumer_key        = TWITTER_CONSUMER_KEY
    config.consumer_secret     = TWITTER_CONSUMER_SECRET
    config.access_token        = session[:user_twitter_access_token]
    config.access_token_secret = session[:user_twitter_access_token_secret]
  end
  #client = settings.twitter_client
  tweets = []
  client.search("to:posterdone #{filter_text}", :count => 100).each do |tweet|
    t = {:id => tweet.id, :uri => tweet.uri, :text => tweet.text, :favorited => tweet.favorited}
    if tweet.media[0]
      t[:photo_uri] = tweet.media[0].media_uri.to_s
    end
    tweets << t
  end
  tweets.to_json
end

get '/favorites.json' do
  client = Twitter::REST::Client.new do |config|
    config.consumer_key        = TWITTER_CONSUMER_KEY
    config.consumer_secret     = TWITTER_CONSUMER_SECRET
    config.access_token        = session[:user_twitter_access_token]
    config.access_token_secret = session[:user_twitter_access_token_secret]
  end
  #client = settings.twitter_client
  favorites = []
  loop do
    options = {:count => 100}
    if favorites.count > 0
      options[:max_id] = favorites.last - 1
    end
    _favorites = []
    client.favorites('posterdone',  options).each do |t|
      _favorites << t.id
    end
    p _favorites.count
    break if _favorites.count == 0
    favorites += _favorites
  end
  content_type :json
  favorites.to_json
end

post '/favorite.json' do
  tweet_uri = params[:tweet_uri]
  p tweet_uri
  content_type :json
  client = settings.twitter_client
  p client.favorite(tweet_uri)
  {}.to_json
end

