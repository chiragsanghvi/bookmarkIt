$(document).ready(function() {
    var user =  window.localStorage.getItem('bookmarkit-user'); 
    if (user) { 
        App.user = JSON.parse(user);
    } 
    App.initialize();
});