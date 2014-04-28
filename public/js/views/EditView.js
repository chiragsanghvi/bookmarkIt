var EditView = Backbone.View.extend({
    
    events: {
      "click .save":            "save",
      "click .cancel":          "cancel",
      "submit form":            "save"
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'unrender', 'save', 'cancel');
    },

    render: function() {
        this.addTags = [];

        var source = Templates.edit;
        var template = Handlebars.compile(source);
        var html = template(this.model.attributes);
        $(this.el).html(html);
        
        $('body').append(this.el);
        var self = this;
        this.$('input[name=tags]').attr('id', 'tags' + this.model.id);
        this.$('input[name=tags]').tagsInput({
            autocomplete_url: function (request, response) {
                $.getJSON('/json/autocomplete?term=' + $(this.element).val(), function(results) {
                    if (!results) return;         
                    var output = [];
                    results.forEach(function(item) {
                        output.push({ label: item.tag, value: item.tag, item: item });
                    });
                    response(output);
                });
            }, 
            unique: true,
            onAddTag: function(value, item) {
                if (item) self.addTags.push(item.item);
                else self.addTags.push({ tag: value });
            },
            onRemoveTag: function(value, item) {
                for (var i = 0; i < self.addTags.length; i = i+1) {
                    if (self.addTags[i].tag == value) {
                        self.addTags[i].splice(i, 1);
                        break;
                    }
                }
            }                                  
        });
        
        $(this.el).modal({
            backdrop: true,
            keyboard: false,
            show: true
        });
    },
    
    unrender: function() {
        $(this.el).modal('hide');
        $(this.el).remove();
    },
    
    save: function(e) {
        e.preventDefault();
        
        var url = this.$('input[name=url]').val();
        var title = this.$('input[name=title]').val();
        var description = this.$('input[name=description]').val();
        var taglist = this.$('input[name=tags]').val();
        var tags = Array();

        var re = /^(http[s]?:\/\/){0,1}(www\.){0,1}[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,5}[\.]{0,1}/;
        
        var error = '';

        if (url.length == 0) {
            error = 'Please fill url.';
        } else if (!re.test(url)) {
            error = 'That url is invalid.';
        } else if (title.length == 0) {
            error = 'Please fill title.';
        } 
        
        if (error != '') {
            $('.bookmark_info').css('color','red').html(error);
            return false;   
        } else {
            $('.bookmark_info').css('color','green').html('');
        }

        if (taglist.indexOf(',') !== -1) {
            tags = taglist.split(',');
        } else if (taglist.length > 0) {
            tags.push(taglist);
        }

        var isNew = true;

        this.model.set({ url: url, title: title, description: description }, { silent: true });

        var hasChanged = this.model.hasChanged();

        var removeTags = [];

        if (!this.model.isNew()) {
            isNew = false;  
            var oldTags = _.clone(this.model.get('tags'));
            removeTags = _.difference(oldTags, tags);
        }

        var self = this;
        
        if (!hasChanged && this.addTags.length == 0 && removeTags.length == 0) {
            self.unrender();
            return;
        }

        if (this.model.hasChanged('url')) {
            this.model.set({ urlChanged: true });
        }

        this.model.set({ addTags: this.addTags, timestamp: new Date().getTime(), tags: tags }, { silent: true });
        this.model.set({ removeTags: removeTags }, { silent: true });

        var changed = this.model.changedAttributes();

        var l = Ladda.create($('.save')[0]);
        $('.cancel').hide();

        l.start();

        var error = function() {
            l.stop();
            $('.cancel').show();
            console.log(err);
            $('.bookmark_info').html('Unable to save bookmark');
        };

        var success = function(bookmark) {
            l.stop();
            console.log(bookmark);
            $('.cancel').show();
            if (bookmark.id) {
                self.model.set(bookmark.attributes);
                if (isNew) {
                    App.router.view.body.collection.add(self.model, { at: 0 });
                } else {
                    $(App.router.view.body.el).masonry('reload');
                }
                
                self.unrender();
            } else {
                error(bookmark);
            }
        };

        this.model.save(null, { wait: true, success: success , error: error });
        
    },
    
    cancel: function(e) {
        e.preventDefault();
        this.unrender();
    }
    
});
