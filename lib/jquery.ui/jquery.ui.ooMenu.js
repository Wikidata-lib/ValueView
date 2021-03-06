/**
 * jQuery.ui.ooMenu provides an object-oriented menu structure. Menu items are managed using
 * specific objects instead of DOM elements.
 *
 * @licence GNU GPL v2+
 * @author H. Snater < mediawiki@snater.com >
 *
 * @option {jQuery.ui.ooMenu.Item[]} [items]
 *         List of items to display.
 *         Default: []
 *
 * @option {jQuery.ui.ooMenu.CustomItem[]} [customItems]
 *         List of custom items.
 *         Default: []
 *
 * @option {Function|null} [manipulateLabel]
 *         Function applied to each label before rendering.
 *         Parameters:
 *         - {string} Item label.
 *         Expected return value:
 *         - {string} Item label.
 *         Default: null
 *
 * @option {number|null} [maxItems]
 *         Maximum number of visible items. If there are more items, scrollbars will be shown. Set
 *         to "null" to never have scrollbars on the menu.
 *         Default: 10
 *
 * @event focus: Triggered when focusing/activating an item.
 *        (1) {jQuery.Event}
 *        (2) {jQuery.ui.ooMenu.Item}
 *
 * @event blur: Triggered when blurring/deactivating an item.
 *        (1) {jQuery.Event}
 *
 * @event selected: Triggered when selecting an item.
 *        (1) {jQuery.Event}
 *        (2) {jQuery.ui.ooMenu.Item|null}
 *
 * @dependency jQuery.util.getscrollbarwidth
 * @dependency util.inherit
 */
( function( $, util ) {
'use strict';

$.widget( 'ui.ooMenu', {

	/**
	 * @see jQuery.Widget.options
	 */
	options: {
		items: [],
		customItems: [],
		manipulateLabel: null,
		maxItems: 10
	},

	/**
	 * @see jQuery.Widget._create
	 */
	_create: function() {
		this.element
		.addClass( 'ui-ooMenu' )
		.addClass( 'ui-widget' )
		.addClass( 'ui-widget-content' );

		this._refresh();
	},

	/**
	 * @see jQuery.Widget.destroy
	 */
	destroy: function() {
		this.element
		.removeClass( 'ui-ooMenu' )
		.removeClass( 'ui-widget' )
		.removeClass( 'ui-widget-content' );

		this.element.empty();

		$.Widget.prototype.destroy.call( this );
	},

	/**
	 * @see jQuery.Widget._setOption
	 *
	 * @throws {Error} when trying to set "items" or "customItems" option with improper values.
	 */
	_setOption: function( key, value ) {
		if( key === 'items' || key === 'customItems' ) {
			if( !$.isArray( value ) ) {
				throw new Error( key + ' needs to be an array' );
			}

			for( var i = 0; i < value.length; i++ ) {
				if(
					key === 'items' && !( value[i] instanceof $.ui.ooMenu.Item )
					|| key === 'customItems' && !( value[i] instanceof $.ui.ooMenu.CustomItem )
				) {
					throw new Error( key + ' may only feature specific instances' );
				}
			}
		}

		$.Widget.prototype._setOption.apply( this, arguments );

		if( key === 'items' || key === 'customItems' ) {
			this._refresh();
		} else if( key === 'maxItems' ) {
			this.scale();
		}
	},

	/**
	 * Updates the menu content.
	 */
	_refresh: function() {
		this.element.empty();
		for( var i = 0; i < this.options.items.length; i++ ) {
			this._appendItem( this.options.items[i] );
		}

		for( var j = 0; j < this.options.customItems.length; j++ ) {
			if( this._evaluateVisibility( this.options.customItems[j] ) ) {
				this._appendItem( this.options.customItems[j] );
			}
		}

		this.scale();
	},

	/**
	 * Evaluates whether a custom item is supposed to be visible or not.
	 *
	 * @param {jQuery.ui.ooMenu.CustomItem} customItem
	 * @return {boolean}
	 */
	_evaluateVisibility: function( customItem ) {
		return customItem.getVisibility( this );
	},

	/**
	 * Appends an item to the menu.
	 *
	 * @param {jQuery.ui.ooMenu.Item} item
	 */
	_appendItem: function( item ) {
		var self = this;

		var label = this.options.manipulateLabel
			? this.options.manipulateLabel( item.getLabel() )
			: item.getLabel();

		var $item = $( '<li/>' )
			.addClass( 'ui-ooMenu-item' )
			.attr( 'dir', 'auto' )
			.data( 'ui-ooMenu-item', item )
			.append(
				$( '<a/>' )
				.attr( 'href', item.getLink() )
				.attr( 'tabindex', -1 )
				.html( label )
			);

		if( item instanceof $.ui.ooMenu.CustomItem ) {
			$item.addClass( 'ui-ooMenu-customItem' );

			if( item.getCssClass() ) {
				$item.addClass( item.getCssClass() );
			}
		}

		$item
		.on( 'mouseenter.ooMenu', function() {
			self.activate( item );
		} )
		.on( 'mouseleave.ooMenu', function() {
			self.deactivate();
		} )
		.on( 'mousedown.ooMenu', function( event ) {
			self.select( event );
		} );

		$item.appendTo( this.element );
	},

	/**
	 * Returns whether the menu currently features visible items.
	 *
	 * @param {boolean} includeCustomItems
	 * @return {boolean}
	 */
	hasVisibleItems: function( includeCustomItems ) {
		if( this.options.items.length ) {
			return true;
		}

		if( !includeCustomItems ) {
			return false;
		}

		for( var i = 0; i < this.options.customItems.length; i++ ) {
			if( this._evaluateVisibility( this.options.customItems[i] ) ) {
				return true;
			}
		}

		return false;
	},

	/**
	 * Scales the menu's height to the height of maximum list items and takes care of the menu width
	 * not reaching out of the browser viewport.
	 */
	scale: function() {
		this.element
		.width( 'auto' )
		.height( 'auto' )
		.css( 'overflowY', 'visible' );

		// Constrain height:
		if( this.options.maxItems ) {
			var $children = this.element.children();

			if( $children.length > this.options.maxItems ) {
				var fixedHeight = 0;

				for( var i = 0; i < this.options.maxItems; i++ ) {
					fixedHeight += $children.eq( i ).outerHeight();
				}

				this.element.width( this.element.outerWidth() + $.util.getscrollbarwidth() );
				this.element.height( fixedHeight );
				this.element.css( 'overflowY', 'scroll' );
			}
		}

		// Constrain width if menu reaches out of the browser viewport:
		if( this.element.offset().left + this.element.outerWidth( true ) > $( window ).width() ) {
			this.element.width(
				$( window ).width()
					- this.element.offset().left
					- ( this.element.outerWidth( true ) - this.element.width() )
					- 20 // safe space
			);
		}
	},

	/**
	 * Returns the currently active item.
	 *
	 * @return {jQuery.ui.ooMenu.Item|null}
	 */
	getActiveItem: function() {
		var $item = this.element.children( '.ui-state-hover' );
		return !$item.length ? null : $item.data( 'ui-ooMenu-item' );
	},

	/**
	 * Activates/focuses a specific item.
	 *
	 * @param {jQuery.ui.ooMenu.Item|jQuery} item
	 *
	 * @throws {Error} if the item is not specified correctly.
	 */
	activate: function( item ) {
		var $item;

		if( item instanceof $.ui.ooMenu.Item ) {
			$item = this.element.children( '.ui-ooMenu-item' ).filter( function() {
				return $( this ).data( 'ui-ooMenu-item' ) === item;
			} );
		} else if( item instanceof jQuery && item.data( 'ui-ooMenu-item' ) ) {
			$item = item;
		} else {
			throw new Error( 'Need $.ui.ooMenu.Item instance or menu item jQuery object to activate' );
		}

		this.element.children( '.ui-state-hover' ).removeClass( 'ui-state-hover' );

		var offset = $item.offset().top - this.element.offset().top,
			scroll = this.element.scrollTop(),
			elementHeight = this.element.height();

		if( offset < 0 ) {
			this.element.scrollTop( scroll + offset );
		} else if( offset >= elementHeight ) {
			this.element.scrollTop( scroll + offset - elementHeight + $item.height() );
		}

		$item.addClass( 'ui-state-hover' );

		$( this ).trigger( 'focus', [$item.data( 'ui-ooMenu-item' )] );
	},

	/**
	 * Deactivates the menu (resets activated item).
	 */
	deactivate: function() {
		this.element.children( '.ui-state-hover' ).removeClass( 'ui-state-hover' );
		$( this ).trigger( 'blur' );
	},

	/**
	 * Moves focus to the next item.
	 */
	next: function() {
		this._move( 'next', this.element.children( '.ui-ooMenu-item:first' ) );
	},

	/**
	 * Moves focus to the previous item.
	 */
	previous: function() {
		this._move( 'prev', this.element.children( '.ui-ooMenu-item:last' ) );
	},

	/**
	 * Moves focus in a specific direction.
	 *
	 * @param {string} direction Either "next" or "prev".
	 * @param {jQuery} $edge
	 */
	_move: function( direction, $edge ) {
		if( !this.element.children().length ) {
			return;
		}

		var $active = this.element.children( '.ui-state-hover' );

		if( !$active.length ) {
			this.activate( $edge );
			return;
		}

		var $nextItem = $active[direction + 'All']( '.ui-ooMenu-item' ).eq( 0 );

		if( $nextItem.length ) {
			this.activate( $nextItem );
		} else {
			this.activate( $edge );
		}
	},

	/**
	 * Selects an item.
	 */
	select: function( event ) {
		var $item = this.element.children( '.ui-state-hover' );

		var item = !$item.length ? null : $item.data( 'ui-ooMenu-item' );

		if( item instanceof $.ui.ooMenu.CustomItem ) {
			var action = item.getAction();
			if( $.isFunction( action ) ) {
				action();
			}
		}

		var selectedEvent = $.Event( 'selected', {
			originalEvent: event || null
		} );

		$( this ).trigger( selectedEvent, [item] );
	}
} );


/**
 * Default menu item.
 * @constructor
 *
 * @param {string|jQuery} label The label to display in the menu.
 * @param {string|null} [value] The value to display in the input element if the item is selected.
 * @param {string} [link] Optional URL the item shall link to.
 *
 * @throws {Error} if any required parameter is not specified properly.
 */
var Item = function( label, value, link ) {
	if( !label ) {
		throw new Error( 'Label needs to be specified' );
	}

	this._label = label;
	this._value = value || ( label instanceof jQuery ? label.text() : label );
	this._link = link || null;
};

$.extend( Item.prototype, {
	/**
	 * @type {jQuery|string}
	 */
	_label: null,

	/**
	 * @type {string}
	 */
	_value: null,

	/**
	 * @type {string|null}
	 */
	_link: null,

	/**
	 * @return {jQuery}
	 */
	getLabel: function() {
		return this._label instanceof String
			? $( document.createTextNode( this._label ) )
			: this._label;
	},

	/**
	 * @return {string}
	 */
	getValue: function() {
		return this._value;
	},

	/**
	 * @return {string}
	 */
	getLink: function() {
		return this._link || 'javascript:void(0);';
	}
} );


/**
 * Customizable menu item.
 * @constructor
 * @extends jQuery.ui.ooMenu.Item
 *
 * @param {string|jQuery} label
 * @param {Function|null} [visibility] Function to determine the item's visibility. If "null", the
 *        item will always be visible.
 *        Parameters:
 *        - {jQuery.ui.ooMenu}
 *        Expected return value:
 *        - {boolean}
 * @param {Function|null} [action]
 * @param {string|null} [cssClass]
 * @param {string} [link]
 *
 * @throws {Error} if any required parameter is not specified properly.
 */
var CustomItem = function( label, visibility, action, cssClass, link ) {
	if( !label ) {
		throw new Error( 'Label needs to be specified' );
	}

	this._label = label;
	this._visibility = visibility || null;
	this._action = action || null;
	this._cssClass = cssClass || '';
	this._link = link || null;
};

CustomItem = util.inherit(
	Item,
	CustomItem,
	{
		/**
		 * @type {Function|null}
		 */
		_visibility: null,

		/**
		 * @type {Function|null}
		 */
		_action: null,

		/**
		 * @type {string}
		 */
		_cssClass: null,

		/**
		 * @see jQuery.ui.ooMenu.Item.getValue
		 */
		getValue: function() {
			return '';
		},

		/**
		 * @return {Function}
		 */
		getVisibility: function( menu ) {
			return $.isFunction( this._visibility )
				? this._visibility( menu )
				: true;
		},

		/**
		 * @return {Function|null}
		 */
		getAction: function() {
			return this._action;
		},

		/**
		 * @return {string}
		 */
		getCssClass: function() {
			return this._cssClass;
		}
	}
);

$.extend( $.ui.ooMenu, {
	Item: Item,
	CustomItem: CustomItem
} );

} )( jQuery, util );
