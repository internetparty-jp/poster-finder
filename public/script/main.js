var Categories;
var Issues;
var SelectedIssueSubject;
var SelectedTweet;
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
      getTweets(filterText);
    }
  });
  $('#issue_filter').change(function() {
    filterIssue();
  });
  $('#filter_issues_button').click(function() {
    //console.log('filter_issues_button');
    filterIssue();
  });
  $('#tweet_filter').change(function() {
    filterText = $('#tweet_filter').val();
    //console.log(filterText);
    getTweets(filterText);
  });
  $('#search_tweets_button').click(function() {
    filterText = $('#tweet_filter').val();
    //console.log(filterText);
    getTweets(filterText);
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

var getTweets = function(filterText) {
  $('#tweets img.loading').css('visibility', 'visible');  // visible/hidden
  $('#tweets .content table tr').remove();
  $.ajax({
    'url': '/tweets.json',
    'data': {'filter_text': filterText},
    'success': function(tweets) {
      //console.log(tweets);
      for(var i=0; i<tweets.length; i++) {
        var tweet = tweets[i];
        //if(!tweet.favorited && !Favorites[tweet.id]) {
        if(true) {
          var radioID = 'tweet_' + tweet.id;
          var row = '<tr class="' + cellClass(i) + '" id="tweet_tr_' + tweet.id + '">';
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
          $('#' + radioID).click(getTweetRadioButtonClickHandler(tweet));
        }
      }
      $('#tweets img.loading').css('visibility', 'hidden');  // visible/hidden
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
            $('#issue_tr_' + parseInt(issue.id)).remove();
            $('#tweet_tr_' + SelectedTweet.id).remove();
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

