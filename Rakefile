#require 'rubygems'
#require 'bundler'
#
#require 'rake'

require 'redis'
require 'twitter'

          REDISTOGO_URL = ENV["REDISTOGO_URL"]
   TWITTER_CONSUMER_KEY = ENV['TWITTER_CONSUMER_KEY']
TWITTER_CONSUMER_SECRET = ENV['TWITTER_CONSUMER_SECRET']
   TWITTER_ACCESS_TOKEN = ENV['TWITTER_ACCESS_TOKEN']
  TWITTER_ACCESS_SECRET = ENV['TWITTER_ACCESS_SECRET']
              REDIS_KEY = 'posterfinder:favorites'

desc 'import favs'
task :dig_favorites do
  redis = redisClient
  client = twitterClient

  options = {:count => 100}
  if min_id = redis.hkeys(REDIS_KEY).min
    min_id = min_id.to_i
    options[:max_id] = min_id - 1
  end

  client.favorites('posterdone', options).each do |t|
    p t.id
    redis.hset(REDIS_KEY, t.id, true)
  end

  favorites = redis.hkeys(REDIS_KEY)
  puts "total: #{favorites.count}"
end

def redisClient
  if REDISTOGO_URL
    uri = URI.parse(REDISTOGO_URL)
    redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
  else
    redis = Redis.new
  end
  return redis
end

def twitterClient
  client = Twitter::REST::Client.new do |config|
    config.consumer_key        = TWITTER_CONSUMER_KEY
    config.consumer_secret     = TWITTER_CONSUMER_SECRET
    config.access_token        = TWITTER_ACCESS_TOKEN
    config.access_token_secret = TWITTER_ACCESS_SECRET
  end
  return client
end

