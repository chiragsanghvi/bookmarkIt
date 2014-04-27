var TagsView = Backbone.View.extend({
    
    initialize: function() {
        _.bindAll(this, 'fetch', 'render', 'unrender');
                
        this.collection = new TagsCollection();
        this.collection.bind('reset', this.render, this);
        
        $(this.el).css('margin', '100px auto 15px auto');
        $(this.el).masonry();
    },
    
    fetch: function(options) {
        $('#loader').remove();
        $('#app').append('<div id="loader"></div>');

        this.collection.models.length = 0;
        this.collection.length = 0;
        this.collection.fetch();
    },
    
    render: function() {
        $('#loader').remove();
        if (this.collection.length == 0) {
            App.router.navigate("bookmarks", true);
            return;
        }

        $(this.el).empty();
        $('#app').append(this.el);
        
        var masonry = $(this.el).data('masonry');
        if (masonry) masonry.destroy()

        var self = this;
        _(this.collection.models).each(function(tag) {
            var tv = new TagView({ model: tag });
            tv.render();
            $(self.el).append(tv.el);
        });
        
        $(this.el).masonry({
            itemSelector: '.taglist',
            columnWidth: 200,
            isFitWidth: true
        });
    },
    
    unrender: function() {
        
        var masonry = $(this.el).data('masonry');
        if (masonry) masonry.destroy();
        $(this.el).empty();
    }

});
