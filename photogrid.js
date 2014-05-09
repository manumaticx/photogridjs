/*
 * photogrid.js
 * CommonJS module for Titanium
 */

// The MIT License (MIT)
//
// Copyright (c) 2014 Manuel Lehner
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var OS_IOS = 'iPhone OS' === Ti.Platform.name, OS_ANDROID = 'android' === Ti.Platform.name;

/**
 * creates the grid view
 * @param {Object} args
 * @return {Ti.UI.ScrollView} gridView
 */
exports.createGrid = function(_args) {
    var args = _args || {},

    // the grid container view
    gridView = Ti.UI.createScrollView({
        width : Ti.UI.FILL,
        height : Ti.UI.FILL,
        contentHeight : Ti.UI.SIZE,
        contentWidth : Ti.UI.FILL,
        layout : 'horizontal',
        backgroundColor : 'transparent',
        scrollType : 'vertical'
    }),

    // default grid configuration
    defaults = {
        // column count in portrait mode
        portraitColumns : 3,
        // column count in landscape mode
        landscapeColumns : 5,
        // space between thumbs
        space : 0,
        // wether title should show up on thumbs or not
        showTitle : false
    },

    // grid data
    data = [],

    // passed args + defaults
    //options = _.defaults(args, defaults);
    options = {};

    for (var attr in args) {
        options[attr] = args[attr];
    }
    for (var attr in defaults) {
        if (!options.hasOwnProperty(attr))
            options[attr] = defaults[attr];
    }

    if (args.hasOwnProperty('data')) {
        data = args.data;
        setData(data);
    }

    // add orientation change listener and remove it when done
    Ti.Gesture.addEventListener('orientationchange', onOrientationChange);
    gridView.addEventListener('close', function() {
        Ti.Gesture.removeEventListener('orientationchange', onOrientationChange);
    });

    /**
     * set items to the grid
     * @param {Array} List of items (item is an {Object} containing image, thumb and title)
     */
    function setData(_data) {

        data = _data;
        clearGrid();

        var thumbSize = getThumbSize();

        for (var i = 0; i < data.length; i++) {
            addItem(data[i], i, thumbSize);

        }
    };

    /**
     * adds a single item to the grid
     */
    function addItem(item, _index, _thumbSize) {

        var index = _index || data.length, thumbImage = item.thumb || item.image, thumbSize = _thumbSize || getThumbSize();

        if ('undefined' === typeof _index) {
            data.push(item);
        }

        var itemView = Ti.UI.createView({
            width : thumbSize,
            height : thumbSize,
            top : options.space,
            left : options.space,
            backgroundImage : thumbImage,
            _image : item.image,
            _index : index
        });

        if (options.showTitle) {

            var titleView = Ti.UI.createView({
                width : Ti.UI.FILL,
                height : thumbSize * 0.2,
                backgroundColor : '#000',
                opacity : 0.7,
                bottom : 0
            });

            var titleLabel = Ti.UI.createLabel({
                text : item.title,
                width : Ti.UI.FILL,
                height : (thumbSize * 0.2) - 6,
                left : 4,
                font : {
                    fontSize : 14
                },
                ellipsize : true,
                color : '#fff',
                textAlign : Ti.UI.TEXT_ALIGNMENT_LEFT
            });

            titleView.add(titleLabel);
            itemView.add(titleView);
        }

        itemView.addEventListener('click', onItemSelected);
        gridView.add(itemView);
    };

    /**
     * removes data from grid
     */
    function clearGrid() {

        if (gridView.children.length > 0) {

            gridView.getChildren().each(function(itemView) {
                itemView.removeEventListener('click', onItemSelected);
                gridView.remove(itemView);
                itemView = null;
            });

            gridView.removeAllChildren();
        }
    };

    /**
     * calculate thumb size
     * @return {Number} width / height in dp
     */
    function getThumbSize() {

        var orientation = Ti.Gesture.orientation, screenWidth = Ti.Platform.displayCaps.getPlatformWidth(), thumbSize, columns = 0;

        OS_ANDROID && (screenWidth /= Ti.Platform.displayCaps.logicalDensityFactor);

        if (orientation == Ti.UI.LANDSCAPE_LEFT || orientation == Ti.UI.LANDSCAPE_RIGHT) {
            columns = options.landscapeColumns;
        } else {
            columns = options.portraitColumns;
        }

        thumbSize = (screenWidth - ((columns + 1) * options.space )) / columns;
        return Math.floor(thumbSize);
    };

    /**
     * thumbnail click-listener callback
     * @param {Object} e
     */
    function onItemSelected(e) {
        Ti.API.info('onItemSelected: ' + e.source);

        var detailWindow = createDetailWindow({
            data : data,
            index : e.source._index
        });

        detailWindow.open();
    };

    /**
     * resize thumbnails on orientation change
     * @param {Object} e
     */
    function onOrientationChange(e) {

        var newSize = getThumbSize();

        gridView.getChildren().each(function(itemView) {
            itemView.setWidth(newSize);
            itemView.setHeight(newSize);
        });
    };

    // gridView methods
    gridView.setData = setData;
    gridView.addItem = addItem;
    gridView.clearGrid = clearGrid;

    return gridView;
};

/**
 * creates the detail window
 * @param {Object} args
 * @return {Ti.UI.Window} detailWindow
 */
function createDetailWindow(_args) {
    var args = _args || {}, data = [],

    // a container window for the detail view
    detailWindow = Ti.UI.createWindow({
        backgroundColor : '#000',
        orientationModes : [Ti.UI.LANDSCAPE_LEFT, Ti.UI.LANDSCAPE_RIGHT, Ti.UI.PORTRAIT, Ti.UI.UPSIDE_PORTRAIT],
        fullscreen : true,
        navBarHidden : true
    }),

    // the scrollable view for swiping through the photos
    photos = Ti.UI.createScrollableView({
        width : Ti.UI.FILL,
        height : Ti.UI.FILL,
        currentPage : args.index || 0
    });

    // create imageViews for the data (if passed)
    if (args.hasOwnProperty('data')) {
        args.data.each(function(photo) {
            var photoView = Ti.UI.createImageView({
                width : Ti.UI.FILL,
                height : Ti.UI.SIZE,
                image : photo.image
            });
            data.push(photoView);
        });

        photos.setViews(data);
    }

    //args.hasOwnProperty('index') && photos.setCurrentPage(args.index);

    detailWindow.add(photos);

    return detailWindow;
};
