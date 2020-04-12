/**
 * Plugin inserting Gallery elements into CKEditor editing area.
 *
 * Created out of the CKEditor Plugin SDK:
 * http://docs.ckeditor.com/#!/guide/plugin_sdk_sample_1
 *
 * Copyright (c) 2003-2013, Cricri042. All rights reserved.
 * Tergeted for "viewerjs" JavaScript: https://github.com/fengyuanchen/viewerjs
 *
 */

// Register the plugin within the editor.
(function () {

    if (!window.console) console = {
        log: function () {
        }
    };

    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (fn, scope) {
            'use strict';
            var i, len;
            for (i = 0, len = this.length; i < len; ++i) {
                if (i in this) {
                    fn.call(scope, this[i], i, this);
                }
            }
        };
    }

    CKEDITOR.plugins.add('gallery', {
        // Translations, available at the end of this file, without extra requests
        requires: 'contextmenu,fakeobjects',
        lang: 'en,id', // lang : [ 'en', 'fr' ],

        getGalleryDialogCss: function () {
            return 'img.cke_gallery' +
                '{' +
                'background-image: url(' + CKEDITOR.getUrl(this.path + 'images/placeholder.png') + ');' +
                'background-position: center center;' +
                'background-repeat: no-repeat;' +
                'background-color:Azure;' +
                'border: 1px solid #a9a9a9;' +
                'width: 100px;' +
                'height:100px;' +
                'margin: 5px;' +
                '}';
        },

        // Register the icons.
        icons: 'gallery',

        onLoad: function () {
            // v4
            if (CKEDITOR.addCss)
                CKEDITOR.addCss(this.getGalleryDialogCss());

        },

        // The plugin initialization logic goes inside this method.
        init: function (editor) {
            var lang = editor.lang.gallery;

            // Check for CKEditor 3.5
            if (typeof editor.element.data == 'undefined') {
                alert('The "Gallery" plugin requires CKEditor 3.5 or newer');
                return;
            }

            allowed = '';
            allowed += ' html head title; style [media,type]; body (*)[id]; meta link [*]',
                allowed += '; img[*]{*}(*)';
            allowed += '; div[*]{*}(*)';
            allowed += '; script[*]{*}(*)';
            allowed += '; ul[*]{*}(*)';
            allowed += '; li[*]{*}(*)';

            // Register the command.
            editor.addCommand('gallery', new CKEDITOR.dialogCommand('galleryDialog', {
                allowedContent: allowed,
                requires: ['fakeobjects']
            }));

            // Create a toolbar button that executes the above command.
            editor.ui.addButton('Gallery', {
                // The text part of the button (if available) and tooptip.
                label: lang.insertGallery,
                command: 'gallery',
                // The button placement in the toolbar (toolbar group name).
                toolbar: 'insert',
                icon: this.path + 'icons/slider.svg'
            });

            editor.on('load', function (evt) {
            });

            editor.on('doubleclick', function (evt) {
                var element = evt.data.element;
                if (element.is('img') && element.data('cke-real-element-type') == 'gallery')
                    evt.data.dialog = 'galleryDialog';
            });

            editor.on('instanceReady', function () {
                //console.log('START --------------------------');
                //console.log( editor.filter.allowedContent );
                //console.log('END ----------------------------');
            });

            //		CKEDITOR.on('instanceReady', function(event) {
            //			  event.editor.on('dialogShow', function(dialogShowEvent) {
            //			    if(CKEDITOR.env.ie) {
            ////			      $(dialogShowEvent.data. "_" .element.$).find('a[href*="void(0)"]').removeAttr('href');
            //			    }
            //			  });
            //			});

            if (editor.contextMenu) {
                editor.addMenuGroup('galleryGroup');
                editor.addMenuItem('galleryItem', {
                    label: lang.editGallery,
                    icon: this.path + 'icons/slider.svg',
                    command: 'gallery',
                    group: 'galleryGroup'
                });

                editor.contextMenu.addListener(function (element, selection) {
                    if (element && element.is('img') && !element.isReadOnly()
                        && element.data('cke-real-element-type') == 'gallery') {
                        //if ( element && element.is( 'img' ) && element.data( 'cke-real-element-type' ) == 'gallery' ) {
                        editor.contextMenu.removeAll(); // this line removes all entries from the context menu
                        return { galleryItem: CKEDITOR.TRISTATE_OFF };
                    } else {
                        return null;
                    }
                });
            }

            // Register our dialog file. this.path is the plugin folder path.
            CKEDITOR.dialog.add('galleryDialog', this.path + 'dialogs/gallery.js');
            // CKEDITOR.dialog.add('galleryDialog', this.path + 'dialogs/gallery.min.js');

            // v3
            if (editor.addCss)
                editor.addCss(this.getGalleryDialogCss());

            // Add special handling for these items
            CKEDITOR.dtd.$empty['cke:source'] = 1;
            CKEDITOR.dtd.$empty['source'] = 1;
            editor.lang.fakeobjects.gallery = lang.fakeObject;

        }, // Init

        afterInit: function (editor) {
            var dataProcessor = editor.dataProcessor,
                htmlFilter = dataProcessor && dataProcessor.htmlFilter,
                dataFilter = dataProcessor && dataProcessor.dataFilter;

            if (dataFilter) {
                dataFilter.addRules({
                    elements: {
                        div: function (realElement) {
                            if (realElement.attributes['class'] == 'galleryPlugin') {
                                //alert("dataFilter : " + realElement.attributes['class']);
                                var fakeElement = editor.createFakeParserElement(realElement, 'cke_gallery', 'gallery', false),
                                    fakeStyle = fakeElement.attributes.style || '';
                                var imgSrc = CKEDITOR.getUrl('plugins/gallery/images/placeholder.png');
                                var foundOne = false;
                                Array.prototype.forEach.call(realElement, function (node) {
                                    //console.log( "---------> " + node.name );

                                    if (node.name == 'img') {
                                        if (!foundOne) {
                                            //console.log( node );
                                            imgSrc = node.attributes.src;
                                            foundOne = true;
                                        }
                                    }
                                });
                                //fakeStyle = fakeElement.attributes.style = fakeStyle + ' background-image:url("' + imgSrc + '"); ';
                                //fakeStyle = fakeElement.attributes.style = fakeStyle + ' background-size:50%; ';
                                //fakeStyle = fakeElement.attributes.style = fakeStyle + ' display:block; ';
                                //console.log( fakeStyle );
                                fakeStyle = fakeElement.attributes.style = fakeStyle + ' background-image:url("' + imgSrc + '"); ';
                                fakeStyle = fakeElement.attributes.style = fakeStyle + ' background-size:contain; ';
                                fakeStyle = fakeElement.attributes.style = fakeStyle + ' background-repeat:no-repeat; ';
                                fakeStyle = fakeElement.attributes.style = fakeStyle + ' background-position:center; ';
                                fakeStyle = fakeElement.attributes.style = fakeStyle + ' width:64px; ';
                                fakeStyle = fakeElement.attributes.style = fakeStyle + ' height:64px; ';
                                fakeStyle = fakeElement.attributes.style = fakeStyle + ' display:block; ';
                                fakeStyle = fakeElement.attributes.style = fakeStyle + ' border:1px solid black; ';

                                return fakeElement;
                            }
                        }
                    }
                }, { priority: 5, applyToAll: true });
            }
            if (htmlFilter) {
                htmlFilter.addRules({
                    elements: {
                        $: function (realElement) {
                        }
                    }
                });
            }

        } // afterInit

    });
    // v3
    if (CKEDITOR.skins) {
        en = { gallery: en };
        id = { gallery: id };
        // fr = { gallery: fr };
        // ru = { gallery: ru };
        // pt = { gallery: pt };
        // el = { gallery: el };
        // sr = { gallery: sr };
    }
    // Translations
    //CKEDITOR.plugins.setLang( 'gallery', 'fr', fr );
    //CKEDITOR.plugins.setLang( 'gallery', 'en', en );

})();
