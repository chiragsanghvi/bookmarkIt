/*  ==============================================================
    Include required packages
=============================================================== */

var express = require('express'),
    formidable = require('formidable'),
    fs = require('fs'),
    crypto = require('crypto'),
    multiAppacitive = require('multiappacitive').Appacitive,
    parser = require('uglify-js').parser,
    uglifyer = require('uglify-js').uglify;
    
var webshotProcess = require('child_process').fork('./webshot.js');

//var RedisStore = require('connect-redis')(express);

var getAppacitiveInstance = function (user, userToken) {

    var Appacitive = new multiAppacitive();

    Appacitive.config.apiBaseUrl = 'http://apis.appacitive.com/v1.0/'

    Appacitive.initialize({ 
        apikey: "{{your_apikey}}", 
        env: "sandbox",
        appId: "{{your_app_id}}",
        userToken: userToken, 
        user: user
    });

    return Appacitive;
};

/*  ==============================================================
    Configuration
=============================================================== */
//used for session and password hashes
var salt = '20sdkfjk23';

var app = express();

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.cookieSession({ secret: salt, cookie: { maxAge: 3600000 * 24 * 30 }}));
//app.use(express.cookieParser());
//app.use(express.session({ secret: salt, store: new RedisStore, cookie: { maxAge: 3600000 * 24 * 30 } }));
app.use(express.methodOverride());
app.use(express.logger({ format: ':method :url' }));

app.use('/css', express.static(__dirname + '/public/css'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/images', express.static(__dirname + '/public/images'))
app.use(express.favicon(__dirname + '/public/favicon.ico'));

/*  ==============================================================
    Bundle + minify scripts & templates before starting server
=============================================================== */

function bundle() {

    var scripts = [
        'jquery.min',
        'json2',
        'underscore-min',
        'handlebars.min',
        'backbone-min',
        'jquery.masonry.min',
        'jquery.tagsinput.min',
        'bootstrap-modal',
        'jquery-ui.min',
        'models/Bookmark',
        'models/BookmarksCollection',
        'models/Tag',
        'models/TagsCollection',
        'views/PublicView',
        'views/AccountView',
        'views/EditView',
        'views/BookmarkView',
        'views/BookmarksView',
        'views/TagView',
        'views/TagsView',
        'views/AppView',
        'routers/BookmarklyRouter',
        'App'
    ];
    
    var templates = ['account', 'bookmark', 'edit', 'footer', 'header', 'index', 'pub', 'tag', 'bookmarks'];
    
    var bundle = '';
    scripts.forEach(function(file) {  
        bundle += "\n/**\n* " + file + ".js\n*/\n\n" + fs.readFileSync(__dirname + '/public/js/' + file + '.js') + "\n\n";
    });
    
    var ast = parser.parse(bundle);
    ast = uglifyer.ast_mangle(ast);
    ast = uglifyer.ast_squeeze(ast);
    bundle = uglifyer.gen_code(ast)
    
    fs.writeFileSync(__dirname + '/public/js/bundle.js', bundle, 'utf8');
    
    bundle = "Templates = {};\n";
    templates.forEach(function(file) {
        var html = fs.readFileSync(__dirname + '/public/templates/' + file + '.html', 'utf8');
        html = html.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/gm, ' ').replace(/'/gm, "\\'");
        bundle += "Templates." + file + " = '" + html + "';\n";
    });
    
    fs.writeFileSync(__dirname + '/public/js/templates.js', bundle, 'utf8');

}

/*  ==============================================================
    Launch the server
=============================================================== */

bundle();
app.listen(3000);

/*  ==============================================================
    Serve the site skeleton HTML to start the app
=============================================================== */

var evaluateResponse = function(status, req, res) {
    if (status && status.code == '19036') {
        req.session = null;
        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(420, { 'Content-Type': 'application/javascript' });
        res.write(JSON.stringify({ code: '19036', message: 'Invalid user token'}), 'utf8');
        res.end('\n');
        return false;
    }

    return true;
};

app.get('*', function(req, res, next) {

    //Regenerates the JS/template file
    if (req.url.indexOf('/bundle') == 0) bundle();

    //Don't process requests for API endpoints
    if (req.url.indexOf('/json') == 0 ) return next();
    
    var init = "$(document).ready(function() { App.initialize(); });";
    if (typeof req.session.user != 'undefined') {
        init = "$(document).ready(function() { App.user = " + JSON.stringify(req.session.user) + "; App.initialize(); });";
    }
    
    fs.readFile(__dirname + '/public/templates/index.html', 'utf8', function(error, content) {
        if (error) console.log(error);
        content = content.replace("{{init}}", init);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content, 'utf-8');
    });
    
});

/*  ==============================================================
    API endpoints for the front-end AJAX requests
=============================================================== */

//Register a new user
app.post('/json/register', function(req, res) {

    var Appacitive = getAppacitiveInstance();

    var user = {
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        firstname: req.body.username,
        last_login: Appacitive.Date.toISOString(new Date())
    };
    
    Appacitive.User.signup(user).then(function(authResult) {
        user = authResult.user.toJSON();
        user.id = authResult.user.id();

        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.write(JSON.stringify(user), 'utf8');
        
        req.session.user_id = user.id;
        req.session.user_token = authResult.token;

        delete user.password;
        req.session.user = user;         

        res.end('\n');
    }, function(err) {
        console.log(err);
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        if (err.code == '600') {
            res.write(JSON.stringify({ error: 'There is already an account with that username' }), 'utf8');    
        } else {
            res.write(JSON.stringify(err));
        }
        res.end('\n');
    });
    
});

//Log in an existing user, starting a session
app.post('/json/login', function(req, res) {
    var Appacitive = getAppacitiveInstance();

    var username = req.body.username;
    var password = req.body.password;
    
    Appacitive.User.login(username, password).then(function(authResult) {
        var user = authResult.user;
        req.session.user_id = user.id();
        req.session.user_token = authResult.token;
        req.session.user = user.toJSON();

        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.write(JSON.stringify(user.toJSON()), 'utf8');
        res.end('\n');

        user.set('last_login', Appacitive.Date.toISOString(new Date()));
        user.save();

    }, function(err) {
        console.log(err);
        req.session = null
        res.writeHead(401, { 'Content-Type': 'text/html' });
        res.end();
    });    
});

//Log out the current user
app.post('/json/logout', function(req, res) {
    if (req.session.user_token) {
        var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);
        Appacitive.User.current().logout(true);
    }
    req.session = null;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end();
});

//Update a user's profile
app.put('/json/user', function(req, res) {
    
    if (typeof req.session.user_token == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }    
    
    var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);

    var user = Appacitive.User.current();
    if (req.body.username && req.body.username.length > 0) user.set('username', req.body.username);
    if (req.body.email && req.body.email.length > 0) user.set('email', req.body.email);

    var cb = function(err) {
        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-type': 'application/json' });
        
        if (err) { 
            console.log(err);
            res.write(JSON.stringify(err), 'utf-8');
        } else res.write(JSON.stringify(user.toJSON()), 'utf-8');
        
        res.end('\n');   
    };

    user.save().then(function() {
        req.session.user = user.toJSON();
        cb(); 
    }, function(err) {
        if (evaluateResponse(err)) cb(err);
    });
  
});

//Update a user's password
app.put('/json/user/password', function(req, res) {
    
    if (typeof req.session.user_token == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }    
    
    var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);

    var user = Appacitive.User.current();

    var cb = function(err) {
        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-type': 'application/json' });
        if (err) { 
            console.log(err);
            res.write(JSON.stringify(err), 'utf-8');
        } else res.write(JSON.stringify({ id: req.session.user_id }), 'utf-8');
        
        res.end('\n');   
    };

    if (!req.body.oldPassword || !req.body.oldPassword.length > 0) {
        cb({ message: 'Provide old password', code: '400'});
        return;
    }
    if (!req.body.newPassword || !req.body.newPassword.length > 0) {
        cb({ message: 'Provide new password', code: '400'});
        return;
    }

    user.updatePassword(req.body.oldPassword, req.body.newPassword).then(function() {
        req.session.user = user.toJSON();
        cb();
    }, function(err) {
        if (evaluateResponse(err)) cb(err);
    });
    
});

var searchTags = function(id, tags, filter, Appacitive, cb)  {
    
    var filterQuery = new Appacitive.Queries.GraphFilterQuery('user_tag', { 
        id : id, 
        tagFilter: filter
    });

    filterQuery.fetch().then(function(ids) {
        if (ids.length == 0) {
            var promise = new Appacitive.Promise();
            promise.fulfill();
            return promise;
        }

        return Appacitive.Object.multiGet({ 
          type: 'tag',
          ids: ids,
          fields: ["tag", "$count"]
        });
    }).then(function(results) {
        if (!results || !results.forEach) results = [];
        
        results.forEach(function(r) { tags.push(r); });
        
        cb();
    }, function(err) {
        if (evaluateResponse(err)) cb(err);
    });
};

//Retrieve a user's tags
app.get('/json/tag', function(req, res) {

    if (typeof req.session.user_token == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }  

    var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);
    
    var tags = [];

    var cb = function(err) {
        if (err) console.log(err);
        else {
            var resTags = [];
            tags.forEach(function(r) {
                resTags.push({ tag: r.get('tag'), id: r.id(), count: r.aggregate('count').all });
            });
            tags = resTags;
        }

        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-type': 'application/json' });
        res.write(JSON.stringify(tags), 'utf-8');
        res.end('\n'); 
    };

    var filter = Appacitive.Filter.Aggregate('count').greaterThanEqualTo(1).toString();
    
    searchTags(req.session.user_id, tags, filter, Appacitive, cb)

});

//Autocomplete for tagging, returns tags matching input
app.get('/json/autocomplete', function(req, res) {
  
    if (typeof req.session.user_token == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }  

    var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);
    
    var tags = [];
    
    var cb = function(err) {
        if (err) console.log(err);
        else {
            var resTags = [];
            tags.forEach(function(r) {
                resTags.push({ tag: r.get('tag'), id: r.id() });
            });
            tags = resTags;
        }

        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-type': 'application/json' });
        res.write(JSON.stringify(tags), 'utf-8');
        res.end('\n'); 
    };

    var filter = '';

    if (req.query['term']) filter = Appacitive.Filter.Property('tag').match(req.query['term']).toString();

    searchTags(req.session.user_id, tags, filter, Appacitive, cb);
    
    console.log('autocomplete # ' + req.url + ' # ' + req.query['term']);
});

var getBookmarkClass = function(Appacitive) {
    return Appacitive.Object.extend('bookmark', {
        getProperties: function() {
            return {
                id: this.id(),
                title: this.get('title'),
                description: this.get('description'),
                tags: this.tags(),
                url: this.get('url'),
                timestamp: this.get('__utclastupdateddate', 'datetime').getTime(),
                screenshot: this.get('screenshot_url')
            }
        }
    });
};

var getBookmark_userConnectionClass = function(Appacitive) {
    return Appacitive.Connection.extend('mybookmark', {
        constructor: function(bookmark) {
            if (bookmark instanceof Appacitive.Object) {
                    var options = {
                        endpoints: [{
                            label: 'user',
                            object: Appacitive.User.current()
                        }, {
                            label: 'bookmark',
                            object: bookmark
                        }]
                    };

                //Invoke internal constructor
                Appacitive.Connection.call(this, options); 
            } else {
                Appacitive.Connection.apply(this, arguments);
            }
        }
    })
};

var getBookmark_TagConnectionClass = function(Appacitive) {
    return Appacitive.Connection.extend('bookmark_tag', {
        constructor: function(tag, bookmark) {
            if (bookmark instanceof Appacitive.Object) {
                Tag = new Appacitive.Object.extend('tag');
                
                if (tag.id) tag.__id = tag.id;
                delete tag.id;

                tag = new Tag(tag);

                var options = {
                    endpoints: [{
                        label: 'tag',
                        object: tag
                    }, {
                        label: 'bookmark',
                        object: bookmark
                    }]
                };

                //Invoke internal constructor
                Appacitive.Connection.call(this, options); 
            } else {
                Appacitive.Connection.apply(this, arguments);
            }
        }
    })
};

//Return a user's bookmarks
app.get('/json/bookmark', function(req, res) {
/*
    res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-type': 'application/json' });
        res.write(JSON.stringify({bookmarks: [], totalRecords: 0 }), 'utf-8');
        res.end('\n');  
*/
    if (typeof req.session.user_id == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }

    var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);
    
    var result = { bookmarks:[], totalRecords: 0 };

    var user = Appacitive.User.current(Appacitive);
    
    var query = user.getConnectedObjects({
        relation: 'mybookmark',
        orderBy: '__utclastupdateddate',
        pageSize: 50
    });

    if (req.query['tag'] && req.query['tag'].length > 0) {
        var tag = req.query['tag'];
        query.filter(new Appacitive.Filter.taggedWithOneOrMore([tag]));
    } else if (req.query['search'] && req.query['search'].length > 0) {
        query.filter(new Appacitive.Filter.Or(
            new Appacitive.Filter.Property('title').match(req.query['search']),
            new Appacitive.Filter.Property('description').match(req.query['search']),
            new Appacitive.Filter.taggedWithOneOrMore(req.query['search'].split(' '))
        ));
    } else {
        var offset = 0;
        if (typeof req.query['offset'] != 'undefined') query.pageNumber(Math.ceil(parseInt(req.query['offset'])/50));
    }

    var cb = function(err) {
        if (err) console.log(err);

        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-type': 'application/json' });
        res.write(JSON.stringify(result), 'utf-8');
        res.end('\n'); 
    };

    var Bookmark = getBookmarkClass(Appacitive);

    query.fetch().then(function(res) {
        
        res.forEach(function(b) {
            result.bookmarks.push(b.getProperties());
        });

        result.totalRecords = res.total;

        cb();
    }, function(err) {
        if (evaluateResponse(err)) cb(err);
    });
   
});

var removeTags = function(Appacitive, bookmark, filter, destroyCon, cb) {
    bookmark.getConnectedObjects({
        relation: 'bookmark_tag',
        returnEdge: true,
        fields: ['__id', '$count'],
        filter: filter
    }).fetch().then(function(tags) {

        var tasks = [];

        tags.forEach(function(tag) {
            if (tag.aggregate('count') && tag.aggregate('count').all <= 1) {
                tasks.push(tag.destroy(true));
            } else if (destroyCon) {
                tasks.push(tag.connection.destroy());
            }
        });

        if (tasks.length == 0) {
            if(cb) cb();
            return;
        }

        return Appacitive.Promise.when(tasks).then(function() {
            if (cb) cb();
        }, function(err) {
            console.log("Errors on deleting tags");
            console.log(err);
        });

    }, function(err) {
        if (cb) cb();

        console.log("Errors on fetching connected tags");
        console.log(err);
    });
}

//Update a bookmark
app.put('/json/bookmark/:id', function(req, res) {

    if (typeof req.session.user_id == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }
    
    var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);
    
    var Bookmark = getBookmarkClass(Appacitive);

    var bookmark = new Bookmark({
        url: req.body.url,
        title: req.body.title,
        description: req.body.description,
        __id: req.body.id
    });

    req.body.addTags.forEach(function(t) {
        bookmark.addTag(t.tag);
    });

    var rTags = req.body.removeTags;

    req.body.addTags.forEach(function(t) {
        bookmark.addTag(t.tag);
    }); 

    rTags.forEach(function(t) {
        bookmark.removeTag(t);
    });    

    var cb = function(err) {
        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-type': 'application/json' });
        if (err) {
           console.log(err);
           res.write(JSON.stringify(err), 'utf-8');
        } else {
            res.write(JSON.stringify(bookmark.getProperties()), 'utf-8');
        }
        res.end('\n');        
    };

    var Tag = Appacitive.Object.extend('tag', {
        constructor: function(attrs) {
            if (attrs.id) attrs.__id = id;
            delete attrs.id;

            Appacitive.Object.apply(this, arguments);
        }
    });

    var id = req.session.user_id;

    var BkmrkConn = getBookmark_TagConnectionClass(Appacitive);

    var urlChanged = req.body.urlChanged;

    bookmark.save().then(function() {
        var tasks = [];

        req.body.addTags.forEach(function(t) {
            var con = new BkmrkConn(t, bookmark);
            tasks.push(con.save());
        });

        cb();

        if (urlChanged){
            webshotProcess.send({ type: 'BMSC', bookmark: bookmark.toJSON() });
        }

        if (rTags.length > 0) {
            removeTags(Appacitive, bookmark, Appacitive.Filter.Property('tag').contains(rTags).toString(), true);
        }

        if (tasks.length == 0) return new Appacitive.Promise().fulfill();

        return Appacitive.Promise.when(tasks);
    }, function(err) {
        cb(err);
    }).then(function() {
        console.log("Connected new tags");
    },  function(err) {
        console.log("Errors on connecting tags");
        console.log(err);
    });        
});



//Create a new bookmark
app.post('/json/bookmark/:id?', function(req, res) {
    
    if (typeof req.session.user_id == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }    
    
    var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);
    
    var Bookmark = getBookmarkClass(Appacitive);

    var bookmark = new Bookmark({
        url: req.body.url,
        title: req.body.title,
        description: req.body.description,
        __tags: req.body.tags
    });

    var MyBkmrk = getBookmark_userConnectionClass(Appacitive)

    var conn = new MyBkmrk(bookmark);

    var cb = function(err) {
        res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
        res.writeHead(200, { 'Content-type': 'application/json' });
        if (err) {
           console.log(err);
           res.write(JSON.stringify(err), 'utf-8');
        } else {
            res.write(JSON.stringify(bookmark.getProperties()), 'utf-8');
        }
        res.end('\n');        
    };

    var tags = [];

    var BkmrkConn = getBookmark_TagConnectionClass(Appacitive);

    //save bookmark connection first and then connect it with tags
    conn.save().then(function() {
        
        var tasks = [];
        req.body.addTags.forEach(function(t) {
            var con = new BkmrkConn(t, bookmark);
            tasks.push(con.save());
        });

        cb();

        webshotProcess.send({ type: 'BMSC', bookmark: bookmark.toJSON() });
        
        if (tasks.length == 0) return new Appacitive.Promise().fulfill();

        return Appacitive.Promise.when(tasks);
    }, function(err) {
        cb(err);
    }).then(null, function(err) {
        console.log(err);        
    });

});

//Delete a bookmark
app.del('/json/bookmark/:id', function(req, res) {
  
    if (typeof req.session.user_id == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }

    var Appacitive = getAppacitiveInstance(req.session.user, req.session.user_token);

    var Bookmark = Appacitive.Object.extend('bookmark');

    var bkmrk = new Bookmark({ __id: req.params.id });
  
    removeTags(Appacitive, bkmrk, '', true, function() {
        bkmrk.destroyWithConnections().then(function() { }, function(err) {
            console.log(err);
        });
    });
  
    res.writeHead(200, { 'Content-type': 'application/json' });
    res.end('\n');
});

//Import bookmarks from an HTML file
app.post('/json/import', function(req, res) {
  
    if (typeof req.session.user_id == 'undefined') {
        res.writeHead(401, { 'Content-type': 'text/html' });
        res.end();
        return;
    }  
      
    var form = new formidable.IncomingForm();
    form.uploadDir = __dirname;
    
    form.addListener('file', function(name, file) {
        fs.readFile(file.path, 'utf8', function(error, content) {
            importFrom(content, req, res);
            fs.unlink(file.path);
        });
    });
    
    form.parse(req, function(err, fields, files) {
      if (err) {
          console.log(err);
          res.end();
      }
    });
 
});

/*  ==============================================================
    Convenience functions
=============================================================== */

function md5(str) {
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex');
};

function importFrom(html, req, res) {

    var regex = /<a([^>]*)>([^<]*)<\/a>/gmi;

    //Extract anchor tags from the import file
    var list = [];
    while (true) {
        matches = regex.exec(html);
            
        if (matches !== null) {
            list.push([matches[1], matches[2]]);
        } else {
            break;
        }
    }
    
    //Stick the attributes from the anchor tag onto an object
    var links = [];
    list.forEach(function(link) {
              
        regex = /(\w+?)=["']{0,1}(.*?)["']{0,1}\s+/g
        var obj = { title: link[1] };
        while (true) {
            matches = regex.exec(' ' + link[0] + ' ');
            if (matches !== null) {
                obj[matches[1].toLowerCase()] = matches[2];
            } else {
                break;
            }
        }
                
        var old = obj.tags;
        if (typeof obj.tags == 'undefined' || obj.tags == '') {
            obj.tags = [];
        } else if (obj.tags.indexOf(',') === -1) {
            obj.tags = [obj.tags];
        } else {
            obj.tags = obj.tags.replace(/"([^,]*),([^"]*)"/gi,"$1 $2").split(',');
        }
      
        if ((obj.href.indexOf('http://') === 0 || obj.href.indexOf('https://') === 0) && obj.title.length > 0) {
            links.push(obj);
        }
    });
    
    console.log("Importing " + links.length + "links");
  
    importQueue = 0;
    links.forEach(function(link) {
        importQueue++;
        link.tags.forEach(function(tag) {
            importQueue++;
        });
    });
    
    //Insert the bookmarks and their tags into the database
    links.forEach(function(link) {
      
        if (typeof link['add_date'] == 'undefined' || parseInt(link['add_date']) == 0) {
            link['add_date'] = 'CURRENT_TIMESTAMP';
        } else {
            link['add_date'] = "FROM_UNIXTIME('" + link['add_date'] + "')";
        }
        console.log(link['add_date']);
        
        if (typeof link['private'] == 'undefined') {
            link['private'] = 0;
        }
              
        var params = [req.session.user_id, link['href'], link['title'], link['private']];
        client.query('INSERT INTO bookmarks (user_id, url, title, private, created_at) VALUES (?, ?, ?, ?, ' + link['add_date'] + ')', params, function(err, info) {
            if (err) console.log(err);
            importQueue--;            
            
            link.tags.forEach(function(tag) {
                tag = tag.replace('.', ' ').replace('-', ' ');
                client.query('INSERT INTO tags (bookmark_id, tag) VALUES (?, ?)', [info.insertId, tag], function(err) {
                    if (err) console.log(err);
                    importQueue--;
                    
                    if (importQueue == 0) {
                        res.writeHead(302, { 'Location': '/bookmarks' });
                        res.end();                      
                    }
                    
                });
            });
            
            if (importQueue == 0) {
                res.writeHead(302, { 'Location': '/bookmarks' });
                res.end();                      
            }            
        
        });
    
    });
};
