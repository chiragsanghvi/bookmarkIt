var AppView = Backbone.View.extend({
    
    events: {
        "click  #btn-home":            "home",
        "click  #btn-mytags":          "mytags",
        "click  #btn-addbookmark":     "addbookmark",
        "click  #btn-account":         "account",
        "click  #btn-logout":          "logout",
        "submit #frm-search":          "search",        
        "submit #frm-login":           "login"
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'search', 'home', 'mytags', 'addbookmark', 'account', 'logout', 'login');
    },
    
    render: function() {
        $('#header').html(Templates.header);
        
        if (typeof App.user != 'undefined') {
            $('#header .public').addClass('hidden');
        } else {
            $('#header .logged-in').addClass('hidden');
        }
    },
    
    home: function(e) {
        e.preventDefault();
        App.router.navigate("", true);
    },
    
    search: function(e) {
        e.preventDefault();
        var term = $(e.target).find('input').val();
        $(e.target).find('input').val('').blur();
        App.router.navigate("search/" + term, true);
    },
    
    mytags: function(e) {
        e.preventDefault();
        App.router.navigate("mytags", true);
    },
    
    addbookmark: function(e) {
        e.preventDefault();
        App.router.navigate("bookmarks", true);
        new EditView({ model: new Bookmark() }).render();        
    },
    
    account: function(e) {
        console.log("Account clicked");
        e.preventDefault();
        App.router.navigate("account", true);
    },
    
    logout: function(e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '/json/logout',
            dataType: 'json',
            success: function(data) {
            }
        });  

        setTimeout(function() {
            window.location = '/';
        }, 1000);
    },
    
    login: function(e) {
        e.preventDefault();
        
        var username = $('input[name=username]').val();
        var password = $('input[name=password]').val();
        
        $('#login-error').hide();

        var l = Ladda.create($('button', e.target)[0]);
        l.start();

        $.ajax({
            type: 'POST',
            url: '/json/login',
            dataType: 'json',
            data: { username: username, password: password },
            success: function(data) {              
                App.user = data;                
                $('#header .logged-in').removeClass('hidden');
                $('#header .public').removeClass('show').addClass('hidden');
                App.router.navigate("bookmarks", true);             
            },
            error: function() {
                l.stop();
                $('#login-error').html('Invalid username or password.').show().addClass('alert-message').addClass('error');
            }
        });  

    }

});
