var AccountView = Backbone.View.extend({
    
    events: {
        "submit #frm-account": "account",
        "submit #frm-password": "password"
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'account', 'unrender', 'password');        
    },
    
    render: function() {
        var source = Templates.account;
        var template = Handlebars.compile(source);
        var html = template(App.user);
        $(this.el).html(html);
        
        $(this.el).css('margin', '20px auto 15px auto').addClass('container');
        $('#app').append(this.el);
        
        $(this.el).masonry({
            itemSelector: '.box',
            columnWidth: 460,
            isFitWidth: true
        });        
    },
    
    unrender: function() {
        $(this.el).masonry('destroy').detach();
    },
    
    account: function(e) {
        
        e.preventDefault();

        var firstname = this.$('input[name=firstname]').val();
        var email = this.$('input[name=email]').val();
        
        var self = this;

        var error = '';
        
        if (firstname.length == 0 || email.length == 0) {
            error = 'Please fill out all the fields.';
        }

        var emailrx = new RegExp(/^(("[\w-+\s]+")|([\w-+]+(?:\.[\w-+]+)*)|("[\w-+\s]+")([\w-+]+(?:\.[\w-+]+)*))(@((?:[\w-+]+\.)*\w[\w-+]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][\d]\.|1[\d]{2}\.|[\d]{1,2}\.))((25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\.){2}(25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\]?$)/i);
        if (!emailrx.test(email)) {
            error = 'That e-mail address is invalid.';
        }
        
        if (error != '') {
            self.$('.account_info').css('color','red').html(error);
            return false;   
        } else {
            self.$('.account_info').css('color','green').html('');
        }

        this.$('button', self).attr('disabled', 'disabled');
        var l = Ladda.create($('.save', e.target)[0]);
        l.start();

        $.ajax({
            type: 'PUT',
            url: '/json/user',
            dataType: 'json',
            data: { firstname: firstname, email: email },
            success: function(data) {
                l.stop();
                console.log(data);
                if (data.__id) {                
                    App.user = data;
                    console.log(self.$('.account_info'));
                    self.$('.account_info').css('color','green').html('Changes saved')
                } else {
                    self.$('.account_info').css('color','red').html(data.message);
                }

                self.$('button').removeAttr('disabled');
                
                setTimeout(function() {
                    self.$('.account_info').html('');
                }, 3000);
            },
            error: function() {
                l.stop();
                window.location = '/';
            }
        });
        
    },

    password: function(e) {
        e.preventDefault();

        var oldPassword = this.$('input[name=old_password]').val();
        var newPassword = this.$('input[name=new_password]').val();

        var self = this;

        var error = '';
        
        if (oldPassword.length == 0 || newPassword.length == 0) {
            error = 'Please fill old and new password.';
        }
        
        if (error != '') {
            self.$('.account_password').css('color','red').html(error);
            return false;   
        } else {
            self.$('.account_password').css('color','green').html('');
        }

        this.$('button', self).attr('disabled', 'disabled');
        
        var l = Ladda.create($('.password', e.target)[0]);
        l.start();

        $.ajax({
            type: 'PUT',
            url: '/json/user/password',
            dataType: 'json',
            data: { oldPassword: oldPassword, newPassword: newPassword },
            success: function(data) {
                l.stop();
                if (data.id) {
                    self.$('.account_password').html('Password updated').css('color','green');
                } else {
                    self.$('.account_password').html(data.message).css('color','red');
                }

                self.$('input[name=old_password]').val('');
                self.$('input[name=new_password]').val('');

                self.$('button').removeAttr('disabled');
                setTimeout(function() {
                    self.$('.account_password').html('');
                }, 3000);
            },
            error: function() {
                l.stop();
                window.location = '/';
            }
        });
    }

});