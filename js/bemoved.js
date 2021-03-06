var BGMovie = (function() {
    //This class preloads a bunch of images and animates them on a canvas on scroll
    function BGMovie(options) {
        var self = this;

        // Many vedeo editing programs will render images with names like "name_00000.jpg" to "name_00333.jpg"
        // We asume this is the case and auto generate the names with the values from imageCountFirst and imageCountLast
        this.options = _.extend({
            imageDir: '',
            imageHighResDir: '',
            imageLowResDir: '',
            imagePrefix: '',
            imageCountFirst: 0, 
            imageCountLast: 10,
            pxPerImg: 27, //default scroll 27 pixel for each frame
            highResLoadDelay: 250,
        }, options);
        //add tailing slash to dir if its not there.
        this.options.imageDir = this.options.imageDir.replace(/\/?$/, '/');
        this.options.imageHighResDir = this.options.imageHighResDir.replace(/\/?$/, '/');
        this.options.imageLowResDir = this.options.imageLowResDir.replace(/\/?$/, '/');

        this.windowHeight = $(window).height();
        
        this.index = 0;
        this.images = [];
        this.gatherProps();
        this.setImagePreloader();

        $(window).on('resize', function() { self.setTheaterSize() });
        $(window).on('scroll', function() { 
            self.animate();
            clearTimeout($.data(this, 'scrollTimer'));
            $.data(this, 'scrollTimer', setTimeout(function() {
                // user hasn't scrolled in XXms! Lets load high res
                var img = new Image()
                img.src = self.options.imageHighResDir + self.images[self.index];
                img.onload = function() {
                    self.drawImage(true);
                    //console.log('highres preload', img);
                }

            }, self.options.highResLoadDelay));
        });

        // Subscribe to this function to show content in sync with frames
        this.onFrame = function(index, img) {}
        // this function will be fired when all images are loaded
        this.onReady = function() {}
    }

    BGMovie.prototype.gatherProps = function() {
        // TODO
        // this should be inserted as arguments to the class
        this.canvas = document.getElementById('stage');
        this.context = this.canvas.getContext('2d');
        this.storyBox = document.querySelector('.story');
    }

    BGMovie.prototype.setTheaterSize = function() {
        //S et the canvas size to fullscreen
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.windowHeight = $(window).height();
        $(this.storyBox).height(this.images.length * this.options.pxPerImg + this.windowHeight);

        //resizing clear the canvas so it must redraw
        this.drawImage();
    }

    BGMovie.prototype.setImagePreloader = function() {
        // The image preloader uses chainWork and chainWork preload component
        var self = this;

        this.preloader = new ChainWork({debug: false})
        .call(function getImagelist(sync) {
            var start = self.options.imageCountFirst;
            var end = self.options.imageCountLast;
            var core = self.options.imagePrefix;
            for(var i = start; i < end; i++) {
                var prefix = '';
                if(i.toString().length === 2) {
                    prefix = '0';
                }
                if(i.toString().length === 1) {
                    prefix = '00';
                }
                self.images.push(core + prefix + i.toString() + '.jpg');
            }
           
            sync();
        })

        .add('imagePreloader', {
            images: this.images,
            prefix: this.options.imageDir,//add tailing slash if it´s not there
            each: function(counter, percent) {
                //console.log(counter, percent+'%');
            },
            onComplete: function(loadedImages){
               self.loadedImages = loadedImages;
            },
        })
        .call(function() {
            //Helper function to create a range in array python style
            // var range = function(num, val) {
            //     var arr = [];
            //     for(var i=0; i<num; i++) {
            //         if(val === 0)
            //             arr.push(0);
            //         else
            //             arr.push(val || i);
            //     }
            //     return arr;
            // };
            // var addedFrames = range(27, self.images[74]);
            // self.images.splice(74, 0, addedFrames);
            // self.images = _.flatten(self.images);
            self.setTheaterSize();
            self.onReady();
        })
        .play();

    }

    BGMovie.prototype.animate = function() {
        // Calculate the index value and draw new image on the canvas
        var top = $(window).scrollTop() + this.windowHeight;
        this.index = parseInt( (top /  this.options.pxPerImg) - (this.windowHeight/this.options.pxPerImg) );
      
        //prevent index from being more than our last image
        if(this.index >= this.images.length -1) {
            this.index = this.images.length - 1; 
        }
        this.drawImage();

    }

    BGMovie.prototype.drawImage = function(highRes) {
        // Draw on the canvas like background cover
        // method borrowed from this answer 
        // http://stackoverflow.com/questions/21961839/simulation-background-size-cover-in-canvas
        var self = this;
        var ctx = this.context;
        if(highRes) {
            var img = new Image();
        }
        else {
            var img = this.loadedImages[this.index];
        }
        var x = 0;
        var y = 0;
        var w = this.canvas.width;
        var h = this.canvas.height;
        var offsetX = 0;
        var offsetY = 0;

        if(highRes) {
            img.src = this.options.imageHighResDir + this.images[this.index];
        }
        else {
            img.src = this.options.imageDir + this.images[this.index];
        }
        
        this.onFrame(this.index, img);
        
        if (arguments.length === 2) {
            x = y = 0;
            w = ctx.canvas.width;
            h = ctx.canvas.height;
        }

        // default offset is center
        offsetX = typeof offsetX === "number" ? offsetX : 0.5;
        offsetY = typeof offsetY === "number" ? offsetY : 0.5;

        // keep bounds [0.0, 1.0]
        if (offsetX < 0) offsetX = 0;
        if (offsetY < 0) offsetY = 0;
        if (offsetX > 1) offsetX = 1;
        if (offsetY > 1) offsetY = 1;

        var iw = img.width,
            ih = img.height,
            r = Math.min(w / iw, h / ih),
            nw = iw * r,   // new prop. width
            nh = ih * r,   // new prop. height
            cx, cy, cw, ch, ar = 1;

        // decide which gap to fill    
        if (nw < w) ar = w / nw;
        if (nh < h) ar = h / nh;
        nw *= ar;
        nh *= ar;

        // calc source rectangle
        cw = iw / (nw / w);
        ch = ih / (nh / h);

        cx = (iw - cw) * offsetX;
        cy = (ih - ch) * offsetY;

        // make sure source rectangle is valid
        if (cx < 0) cx = 0;
        if (cy < 0) cy = 0;
        if (cw > iw) cw = iw;
        if (ch > ih) ch = ih;

        // fill image in dest. rectangle
        ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
    }

    return BGMovie;

})();

var SpotLight = (function() {
    // This class shows and hides elements on the defined frames
    // Usage new SpotLight('.prop2', i, {enterFrame: 250, leaveFrame: 344});
    function SpotLight(element, i, options) {
        this.element = this.normalizeElement(element);
        this.i = i;
        this.options = _.extend({
            enterFrame: 0,
            leaveFrame: 0,
        }, options);
        

        this.revealElement()
    }

    SpotLight.prototype.normalizeElement = function(element) {
        // Figure out what type of element this is and return the dom element
        var type = typeOf(element);
        if(type === 'element')
            return element;
        if(element instanceof jQuery)
            return element[0];
        if(type === 'string') {
            return document.querySelector(element) || document.querySelector('#' + element) || document.querySelector('.' + element);
        }
    }

    SpotLight.prototype.revealElement = function() {
        if(this.i > this.options.enterFrame || this.i < this.options.leaveFrame) {
            var top = 100 - (this.i - this.options.enterFrame);
            if(top >= 50) {
            $(this.element)
                .show()
                .css({top: top + '%'})
            }
        }
        if(this.i > this.options.leaveFrame || this.i < this.options.enterFrame) {
            var top = 50 - (this.i - this.options.leaveFrame);
            $(this.element)
                .show()
                .css({top: top + '%'})
        }
    }

    return SpotLight;
})()
