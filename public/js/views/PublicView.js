var PublicView = Backbone.View.extend({
    
    events: {
        "submit #frm-signup": "signup"
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'signup');
        $(this.el).css('max-width', '960px').css('margin', '0px auto');
    },
    
    render: function() {
        $(this.el).html(Templates.pub);
        $('#app').append(this.el);
    },
    
    unrender: function() {
        $(this.el).detach();  
    },
    
    signup: function(e) {
        e.preventDefault();
        
        var username = $('#frm-signup input[name=username]').val();
        var password = $('#frm-signup input[name=password]').val();
        var email = $('#frm-signup input[name=email]').val();

        username = $.trim(username);
        password = $.trim(password);
        email = $.trim(email);
        
        var error = '';
        
        var emailrx = new RegExp(/^(("[\w-+\s]+")|([\w-+]+(?:\.[\w-+]+)*)|("[\w-+\s]+")([\w-+]+(?:\.[\w-+]+)*))(@((?:[\w-+]+\.)*\w[\w-+]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][\d]\.|1[\d]{2}\.|[\d]{1,2}\.))((25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\.){2}(25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\]?$)/i);
        if (!emailrx.test(email)) {
            error = 'That e-mail address is invalid.';
        }
        
        if (username.length == 0 || password.length == 0 || email.length == 0) {
            error = 'Please fill out all the fields.';
        }
        
        if (error != '') {
            $('#signup-error').html(error).addClass('alert-message').addClass('error');
            return false;   
        }
        
        var l = Ladda.create($('button', e.target)[0]);
        l.start();

        $.ajax({
            type: 'POST',
            url: '/json/register',
            dataType: 'json',
            data: { username: username, password: password, email: email },
            success: function(data) {
                l.stop();
                if (typeof data.error != 'undefined') {
                    $('#signup-error').html(data.error).addClass('alert-message').addClass('error');
                } else {
                    $('#header .logged-in').removeClass('hidden');
                    $('#header .public').removeClass('show').addClass('hidden');
                    App.user = data;
                    window.localStorage.getItem('bookmarkit-user', JSON.stringify(data)); 
                    App.router.navigate("bookmarks", true);
                }
            },
            error: function() {
                l.stop();
                $('#signup-error').html('An error occurred. Please try again.').addClass('alert-message').addClass('error');
            }
        });          
    }    

});
