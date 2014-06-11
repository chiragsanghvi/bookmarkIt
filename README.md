![Bookmarkit.appacitive.com](http://bookmarkit.appacitive.com/images/homeshot.png)

This repository contains the code behind for [BookmarkIt](http://bookmarkit.appacitive.com), a bookmark organizer built with [Backbone.js](http://backbonejs.org/) in the browser and [Node.js](http://nodejs.org/) on the server with data persisted on [Appacitive](http://www.appacitive.com).

Some features:

* Add bookmarks with a bookmarklet, Chrome extension or through the site
* Saves URL, title, description, tags with autosuggest and a screenshot
* Bookmark grid view resizes with the window and loads more bookmarks on scroll
* No page reloads at all, so moving between pages is near-instant and smooth
* Combines and minifies all the JS source and view templates automatically when the server starts

## Installation

1. Clone this repository

2. Install [Node.js](http://nodejs.org/) and [NPM](http://npmjs.org/)

4. Install dependencies: `npm install -d`

5. Create sample backend on [Appacitive](http://www.appacitive.com/) for this app as shown in this [link](http://vimeo.com/89849527)

6. Replace the apikey and appId `server.js` to point to your app on Appacitive

7. Run `node server.js` and browse to `http://localhost:3000`


## License

Copyright (c) 2012 Dan Grossman. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of the author nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
