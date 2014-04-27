var BookmarksCollection = Backbone.Collection.extend({
    model: Bookmark,
    url: '/json/bookmark',
    parse: function(result) {
    	this.totalRecords = result.totalRecords;
    	return result.bookmarks;
    }
});