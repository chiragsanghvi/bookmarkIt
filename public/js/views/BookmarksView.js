var BookmarksView = Backbone.View.extend({
    
    initialize: function() {
        _.bindAll(this, 'fetch', 'render', 'unrender', 'scroll');
                
        this.collection = new BookmarksCollection();
        this.collection.bind('reset', this.render, this);
        this.collection.bind('add', this.render, this);
    },
    
    fetch: function(options) {
        this.search = false;

        $('#loader').remove();
        $('#app').append('<div id="loader"></div>');

        if (typeof options != 'undefined') {
            this.search = true;
        }
        this.collection.totalRecords  = 0;
        this.collection.fetch(options);        
    },
    
    render: function() {
        $('#loader').remove();
        
        this.offset = 50;

        if (this.search == false) {
            var self = this;
            $(window).scroll(function() { self.scroll(); });        
        }
        
        $(this.el).empty();

        var masonry = $(this.el).data('masonry');
        if (masonry) masonry.destroy()

        $('#app').html('').append(this.el);
        
        if (this.search == false && this.collection.models.length == 0) {
            
            $(this.el).css('width', '960px').css('margin', '0px auto'); 
            $(this.el).html(Templates.bookmarks);
            
        } else {
            
            $(this.el).css('margin', '20px auto 15px auto').css('width', 'auto').css('background', 'transparent');
            $(this.el).html('').addClass('container');
            
            var self = this;
            _(this.collection.models).each(function(bookmark) {
                var bmv = new BookmarkView({ model: bookmark });
                bmv.render();
                $(self.el).append(bmv.el);
            });
            
            $(this.el).masonry({
                itemSelector: '.bookmark',
                columnWidth: 300,
                isFitWidth: true
            });
            
        }

    },
    
    unrender: function() { 
       var masonry = $(this.el).data('masonry');
       if (masonry) masonry.destroy();

       $(this.el).empty();

       $(window).unbind('scroll');
    },
    
    scroll: function() {
        var bottom = $(document).height() - $(window).height() - 50 <= $(window).scrollTop();
        
        var self = this;
        if (bottom) {
            $(window).unbind('scroll');

            var pageNum = 0;

            if (this.collection.totalRecords < this.offset) {
                return;
            }

            $('#loader').remove();
            $('#app').append('<div id="loader"></div>');

            $.getJSON('/json/bookmark?offset=' + this.offset, function(data) {
                $('#loader').remove();
                self.collection.unbind('add');

                self.collection.totalRecords = data.totalRecords;
                data = data.bookmarks;

                self.offset += 50;
                self.collection.add(data);
                
                _(data).each(function(bookmark) {
                    var bmv = new BookmarkView({ model: new Bookmark(bookmark) });
                    bmv.render();
                    $(self.el).append(bmv.el).masonry('appended', $(bmv.el), true);
                });
                
                $(window).scroll(function() { self.scroll(); });

                self.collection.bind('add', self.render, self);
            });
        }
    }

});
