var Categories;
var Issues;
var SelectedIssueSubject;
var SelectedTweet;
var LastTweetID;
//var Favorites = {};

$(document).ready(function(){
  //console.log('Hello');
  $('img.loading').css('visibility', 'hidden');  // visible/hidden
  //$('#mask').css('visibility', 'hidden');  // visible/hidden
  $('#categories').change(function() {
    var categoryID = parseInt($('#categories option:selected').attr('value'));
    //console.log(categoryID);
    getIssues(categoryID);
    if($('#enable_auto_search').prop("checked")){ 
      var filterText = Categories[categoryID];
      //$('#tweet_filter').attr('value', filterText);
      $('#tweet_filter').val(filterText);
      //getTweets(filterText);
      removeTweets();
      beforeGetTweet();
    }
  });
  $('#issue_filter').change(function() {
    filterIssue();
  });
  $('#filter_issues_button').click(function() {
    //console.log('filter_issues_button');
    filterIssue();
  });
  //$('#tweet_filter').change(function() {
  //  filterText = $('#tweet_filter').val();
  //  //console.log(filterText);
  //  removeTweets();
  //  getTweets(filterText, function(){}, function(){});
  //});
  $('#search_tweets_button').click(function() {
    //console.log(filterText);
    //getTweets(filterText);
    removeTweets();
    //var type = $('input[name="search_type"]:checked').val();
    //if(type == 'keyword') {
    //  filterText = $('#tweet_filter').val();
    //  getTweets({'type': type, 'keyword': filterText});
    //}
    //else if(type == 'screen_name') {
    //  screenName = $('#screen_name').val();
    //  getTweets({'type': type, 'screen_name': screenName});
    //}
    beforeGetTweet();
  });
  $('#next_100_button').click(function() {
    filterText = $('#tweet_filter').val();
    //console.log(filterText);
    //getTweets(filterText);
    //removeTweets();
    //getTweets();
    //var type = $('input[name="search_type"]:checked').val();
    //getTweets({'type': type, 'keyword': filterText});
    beforeGetTweet();
  });
  getCategories();
  //setStatsu('ふぁぼを取得中');
  //getFavorites(function() {
  //  $('#mask').css('visibility', 'hidden');  // visible/hidden
  //  setStatsu('ふぁぼの取得完了');
  //}, function(){
  //  $('#mask').css('visibility', 'hidden');  // visible/hidden
  //  setStatsu('ふぁぼの取得失敗 <a href="/auth/twitter">Twitter認証をやりなおす</a>');
  //});
  $('#mask').css('visibility', 'hidden');  // visible/hidden
});

var beforeGetTweet = function() {
  var type = $('input[name="search_type"]:checked').val();
  if(type == 'keyword') {
    filterText = $('#tweet_filter').val();
    getTweets({'type': type, 'keyword': filterText});
  }
  else if(type == 'screen_name') {
    screenName = $('#screen_name').val();
    getTweets({'type': type, 'screen_name': screenName});
  }
}

var filterIssue = function() {
  $('#issues .content table tr').remove();
  var value = $('#issue_filter').val();
  var re = new RegExp(value);
  //console.log(value);
  var filteredIssue = [];
  for(var i=0; i<Issues.length; i++) {
    var issue = Issues[i];
    if(re.exec(issue.subject)) {
      filteredIssue.push(issue);
    }
  }
  setIssuesToTable(filteredIssue, function() {});
}

var getCategories = function() {
  Categories = {};
  $.ajax({
    'url': '/categories.json',
    'data': {},
    'success': function(data) {
      var categories = data.issue_categories;
      //Categories = categories;
      for(var i=0; i<categories.length; i++) {
        var category = categories[i];
        Categories[category.id] = category.name;
        //console.log(category.name);
        var row = '<option value="' + category.id + '">' + category.name + '</option>';
        //console.log(row);
        $('#categories').append(row);
      }
    }
  });
}

var getIssues = function(categoryID) {
  //console.log('getIssues');
  $('#issues img.loading').css('visibility', 'visible');  // visible/hidden
  $('#issues .content table tr').remove();
  $.ajax({
    'url': '/issues.json',
    'data': {'category_id': categoryID},
    'success': function(issues) {
      //console.log(issues);
      Issues = issues;
      setIssuesToTable(issues, function() {
        $('#issues img.loading').css('visibility', 'hidden');  // visible/hidden
        if(issues.length <= 0) {
          alert('データがありません');
        }
      });
    },
    'error': function(XMLHttpRequest, textStatus, errorThrown) {
      //console.log(textStatus);
      //console.log(errorThrown);
      alert(textStatus);
      $('#issues img.loading').css('visibility', 'hidden');  // visible/hidden
    }
  });
}

var setIssuesToTable = function(issues, callback) {
  for(var i=0; i<issues.length; i++) {
    var issue = issues[i];
    var buttonID = 'button_' + parseInt(issue.id);
    var row = '<tr class="' + cellClass(i) + '" id="issue_tr_' + parseInt(issue.id) + '">';
    var subject = issue.subject;
    //row = row + '<td><input type="radio" name="issue_id"></td>';
    //row = row + '<td>' + issue.subject + '</td>';
    row = row + '<td><input type="button" value="' + subject + '" class="done_button" id="' + buttonID + '" data-issue-id="' + issue.id + '"></td>';
    row = row + '<td><a href="http://beta.shirasete.jp/issues/' + issue.id + '" target="_blank">見る</a></td>';
    row = row + '</tr>';
    //console.log(row);
    $('#issues .content table').append(row);
    //console.log(buttonID);
    //$('#' + buttonID).click(onIssueButtonClick);
    $('#' + buttonID).click(getIssueButtonClickHandler(issue));
  }
  callback();
}

var removeTweets = function() {
  $('#tweets .content table tr').remove();
  LastTweetID = null;
}

var getTweets = function(opts) {
  $('#tweets img.loading').css('visibility', 'visible');  // visible/hidden
  //$('#tweets .content table tr').remove();
  var callback = opts['callback'];
  var errorback = opts['errorback'];
  var data = {};
  console.log(opts);
  if(opts['type'] == 'screen_name') {
    data['screen_name'] = opts['screen_name'];
  }
  else {
    data['filter_text'] = opts['keyword'];
  }
  if(LastTweetID){
    data['max_id'] = LastTweetID;
  }
  $.ajax({
    'url': '/tweets.json',
    'data': data,
    'success': function(tweets) {
      //console.log(tweets);
      for(var i=0; i<tweets.length; i++) {
        var tweet = tweets[i];
        //if(!tweet.favorited && !Favorites[tweet.id]) {
        if(true) {
          var radioID = 'tweet_' + tweet.id;
          var row = '<tr class="' + cellClass(i) + '" id="tweet_tr_' + tweet.id + '">';
          var buttonID = 'already_favorited_button_' + tweet.id;
          row = row + '<td><input type="button" id="' + buttonID + '" value="終了済"></td>';
          if(tweet.photo_uri) {
            row = row + '<td>' + tweet.text + '<img src="' + tweet.photo_uri+ '" /></td>';
          }
          else {
            row = row + '<td>' + tweet.text + '</td>';
          }
          row = row + '<td><a href="' + tweet.uri + '" target="_blank">見る</a></td>';
          row = row + '<td class="radio"><input type="radio" name="tweet_id" value="' + tweet.id + '" id="' + radioID + '"></td>';
          row = row + '</tr>';
          //console.log(row);
          $('#tweets .content table').append(row);
          //$('#' + radioID).click(onTweetRadioClick);
          $('#' + buttonID).click(getAlreadyFavoritedButtonClickHandler(tweet));
          $('#' + radioID).click(getTweetRadioButtonClickHandler(tweet));
        }
      }
      console.log(tweets);
      if(tweets.length > 0) {
        var t = tweets[tweets.length-1];
        LastTweetID = t.id;
        console.log(LastTweetID);
      }
      $('#tweets img.loading').css('visibility', 'hidden');  // visible/hidden
      if(callback) {
        callback();
      }
    },
    'error': function(XMLHttpRequest, textStatus, errorThrown) {
      alert('getTweets: ' + textStatus);
      if(errorback) {
        errorback();
      }
    }
  });
}

var cellClass = function(index) {
  var cellClass = '';
  if (index % 2 == 0) {
    cellClass = 'even';
  } else {
    cellClass = 'odd';
  }
  return cellClass;
}

var getIssueButtonClickHandler = function(issue) {
  var f = function(e) {
    //console.log(issue.subject);
    var button = $(e.target);
    //var issueID = button.attr('data-issue-id');
    //var subject = button.val();
    if(SelectedTweet) {
      var ok = window.confirm('報告:"' + SelectedTweet.text + '" を元に' + issue.subject + 'を終了にセットします');
      if(ok){
        $('#mask').css('visibility', 'visible');  // visible/hidden
        closeIssueWithTweetURI(issue.id, SelectedTweet.uri, function() {
          //console.log('closed');
          favoriteTweet(SelectedTweet, function() {
            //console.log('faved');
            $('#issue_tr_' + issue.id).remove();
            $('#tweet_tr_' + SelectedTweet.id).remove();
            SelectedTweet = null;
            $('#mask').css('visibility', 'hidden');  // visible/hidden
          });
        });
      }
    }
    else {
      alert('ツィートを選択してください');
    }
  }
  return f;
}

var getTweetRadioButtonClickHandler = function(tweet) {
  var f = function(e) {
    //console.log(tweet.text);
    SelectedTweet = tweet;
  }
  return f;
}

var getAlreadyFavoritedButtonClickHandler = function(tweet) {
  var f = function(e) {
    var ok = window.confirm('報告:"' + tweet.text + '" をチェック済みツィートとして記録します');
    if(ok) {
      $('#mask').css('visibility', 'visible');  // visible/hidden
      favoriteTweet(tweet, function() {
        $('#tweet_tr_' + tweet.id).remove();
        SelectedTweet = null;
        $('#mask').css('visibility', 'hidden');  // visible/hidden
      });
    }
  }
  return f;
}

var closeIssueWithTweetURI = function(issueID, tweetURI, callback) {
  $.ajax({
    'type': 'PUT',
    'url': '/issues/' + issueID + '.json',
    'data': {'notes': tweetURI},
    'success': function(result) {
      //console.log(result);
      callback();
    },
    'error': function(XMLHttpRequest, textStatus, errorThrown) {
      alert(textStatus);
    }
  });
}

var favoriteTweet = function(tweet, callback) {
  console.log(tweet.id);
  $.ajax({
    'type': 'POST',
    'url': '/favorite.json',
    'data': {'tweet_id': tweet.id, 'tweet_uri': tweet.uri},
    'success': function(result) {
      //console.log(result);
      callback();
    },
    'error': function(XMLHttpRequest, textStatus, errorThrown) {
      alert(textStatus);
    }
  });
}

//var getFavorites = function(callback, errorback) {
//  $.ajax({
//    'type': 'GET',
//    'url': '/favorites.json',
//    'data': {},
//    'success': function(favorites) {
//      console.log(favorites.length);
//      for(var i=0; i<favorites.length; i++) {
//        Favorites[favorites[i]] = true;
//      }
//      callback();
//    },
//    'error': function(XMLHttpRequest, textStatus, errorThrown) {
//      alert(textStatus);
//      errorback();
//    }
//  });
//}

var setStatsu = function(statusText) {
  $('#status').html(statusText);
}

