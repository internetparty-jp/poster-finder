Poster Finder
=============

Twitterで送られてきた貼り付け完了報告をshirasete.jpに反映させる

# development

```bash
$ bundle install --path vendor/bundle
$ TWITTER_CONSUMER_KEY=your_consumer_key \
> TWITTER_CONSUMER_SECRET=your_consumer_secret \
> TWITTER_ACCESS_TOKEN=your_access_token \
> TWITTER_ACCESS_SECRET=your_access_secret \
> SHIRASETE_API_KEY=your_api_key \
> SHIRASETE_PROJECT_ID=your_project_id \
> BASIC_AUTH_USERNAME=username \
> BASIC_AUTH_PASSWORD=password \
> bundle exec rackup
```


# deploy to heroku

```bash
$ git remote add heroku git@heroku.com:your-app-name.git
$ heroku addons:add redistogo
$ heroku config:add TWITTER_CONSUMER_KEY=your_consumer_key
$ heroku config:add TWITTER_CONSUMER_SECRET=your_consumer_secret
$ heroku config:add TWITTER_ACCESS_TOKEN=your_access_token
$ heroku config:add TWITTER_ACCESS_SECRET=your_access_secret
$ heroku config:add SHIRASETE_API_KEY=your_api_key
$ heroku config:add SHIRASETE_PROJECT_ID=your_project_id
$ heroku config:add BASIC_AUTH_USERNAME=username
$ heroku config:add BASIC_AUTH_PASSWORD=password
$ git push heroku master
```

