// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
  log.history = log.history || []; // store logs to an array for reference
  log.history.push(arguments);
  if(this.console) {
    arguments.callee = arguments.callee.caller;
    var newarr = [].slice.call(arguments);
    (typeof console.log === 'object' ? log.apply.call(console.log, console, newarr) : console.log.apply(console, newarr));
  }
};

// make it safe to use console.log always
(function(b){function c(){}for(var d="assert,clear,count,debug,dir,dirxml,error,exception,firebug,group,groupCollapsed,groupEnd,info,log,memoryProfile,memoryProfileEnd,profile,profileEnd,table,time,timeEnd,timeStamp,trace,warn".split(","),a;a=d.pop();){b[a]=b[a]||c}})((function(){try
{console.log();return window.console;}catch(err){return window.console={};}})());

(function($){
  
    $.game = $.game || {};
    $.extend($.game, {
      
        /* ----------------------------------------------------------------
            Game
        ---------------------------------------------------------------- */
        board: {
            $el: $('#board'),
            img: 'gfx/html5-logo.png',
            width: 800,
            height: 600,
            x: 4,
            y: 4
        },
        tile: {
            $els: {},
            border: 1, // border width of each tile
            order: [], // current order of indexes of tiles in board
            emptyIndex: null, // current index of empty tile
            emptyId: null, // id of virtual empty tile
            $draggable: null // current draggable elements
        },
        turn: {
            $el: $('#turn'),
            counter: 0
        },
        
        init: function() {
            var self = this;
            
            self.createBoard();
            self.handleTurn();
            
            $('#variants').delegate('a', 'click', function(e) {
                e.preventDefault();
                
                self.newGame($(this).data('src'));
            });
            
            $('#upload').change(function() {
                self.newGame(window.URL.createObjectURL(this.files[0]));
            });
        },
        
        createBoard: function(img, width, height, x, y) {
            var self = this,
                tilesBuffer = '';
                
            // grab values
            self.board.img = img || self.board.img;
            self.board.width = width || self.board.width;
            self.board.height = height || self.board.height;
            self.board.x = x || self.board.x;
            self.board.y = y || self.board.y;
            
            // count empty tile id
            self.tile.emptyId = self.board.x * self.board.y - 1;
            
            // count tile resolution
            self.tile.width = self.board.width / self.board.x,
            self.tile.height = self.board.height / self.board.y
            
            // shuffle tiles
            self.board.finished = _.range(self.board.x * self.board.y);
            self.tile.order = self.shuffle(self.board.finished);
            
            // create tiles
            $.each(self.tile.order, function(i, val) {
                var x = (val % self.board.x) * self.tile.width,
                    y = Math.floor((val / self.board.x)) * self.tile.height,
                    bgPosition = '-'+ x +'px -'+ y +'px',
                    top = Math.floor((i / self.board.x)) * self.tile.height,
                    left = (i % self.board.x) * self.tile.width,
                    width = self.tile.width - (self.tile.border * 2),
                    height = self.tile.height - (self.tile.border * 2);
                
                // last tile is empty
                if (val !== self.board.x * self.board.y - 1) {
                    tilesBuffer += '<div id="tile'+ val +'" data-id="'+ val +'" style="top: '+ top +'px; left: '+ left +'px; background-image: url('+ self.board.img +'); background-position:'+ bgPosition +'; width:'+ width +'px; height:'+ height +'px;" />';
                }
            });
            
            // append tiles, set board style
            self.board.$el.html(tilesBuffer).css({
                width: self.board.width +'px',
                height: self.board.height +'px'
            });
            // grab tiles
            self.tile.$els = self.board.$el.children();
            
            $('#order').val('['+ self.tile.order.join(', ') +']');
            //[4, 3, 2, 5, 7, 6, 0, 8, 1]
            //[8, 7, 4, 6, 0, 2, 5, 3, 1]
            //[7, 8, 5, 4, 3, 2, 1, 0, 6]
            //[8, 6, 7, 1, 2, 4, 0, 3, 5]
            //[2, 8, 3, 1, 7, 5, 0, 6, 4]
            //[5, 7, 0, 1, 2, 6, 4, 3, 8]
            //[8, 3, 7, 0, 5, 2, 4, 1, 6]
            //[7, 3, 0, 8, 6, 2, 5, 4, 1]
            
            //[9, 13, 3, 7, 6, 8, 14, 2, 0, 1, 4, 5, 10, 15, 11, 12]
            //[5, 7, 11, 15, 10, 6, 12, 8, 1, 4, 13, 14, 9, 2, 0, 3]
            //[13, 9, 12, 10, 1, 3, 7, 15, 14, 0, 6, 2, 5, 4, 11, 8]
        },
        
        shuffle: function(board) {
            var self = this,
                shuffledBoard = _.shuffle(board);
            
            while (!self.isFinishable(shuffledBoard)) {
                shuffledBoard = _.shuffle(board)
            }
            
            return shuffledBoard;
        },
        
        // http://www.cs.bham.ac.uk/~mdr/teaching/modules04/java2/TilesSolvability.html
        isFinishable: function(board) {
            var self = this,
                inversions = 0;
            
            for (var i = 0; i < board.length - 1; i++) {
                var rest = _.rest(board, i + 1),
                    isLower = 0;
                
                for (var j in rest) {
                    var value = board[j - -i + 1];
                    
                    if (value < board[i]) {
                        isLower++;
                    }
                }
                
                inversions += isLower;
            }
            
            self.tile.emptyIndex = _.indexOf(board, self.tile.emptyId);
            var rowWithEmptyTile = Math.ceil(self.tile.emptyIndex / self.board.x);
            
            // ( (grid width odd) && (#inversions even) )  ||  ( (grid width even) && ((blank on odd row from bottom) == (#inversions even)) )
            var gridWidthOdd = self.board.x % 2,
                inversionsEven = !inversions % 2,
                blankOnOddRowFromBottom = rowWithEmptyTile % 2 == self.board.y % 2;
            
            // FIXME when grid width is 3 returns finished board!!!
            return (gridWidthOdd && inversionsEven) || (!gridWidthOdd && (blankOnOddRowFromBottom == inversionsEven));
        },
        
        getDraggableTiles: function() {
            var self = this,
                draggable = [];
            
            // left tile
            var left = self.tile.emptyIndex - 1;
            if (left >= 0 && !(_.indexOf(self.tile.order, self.tile.order[left]) % self.board.x === self.board.x - 1)) {
                draggable.push(self.tile.order[left]);
            }
            
            // right tile
            var right = self.tile.emptyIndex + 1;
            if (right < self.board.x * self.board.y && !(_.indexOf(self.tile.order, self.tile.order[right]) % self.board.x === 0)) {
                draggable.push(self.tile.order[right]);
            }
            
            // top tile
            var top = self.tile.emptyIndex - self.board.x;
            if (top >= 0) {
                draggable.push(self.tile.order[top]);
            }
            
            // bottom tile
            var bottom = self.tile.emptyIndex + self.board.x;
            if (bottom < self.board.x * self.board.y) {
                draggable.push(self.tile.order[bottom]);
            }
            
            // grab draggable tiles
            var dragSel = '#tile'+ draggable.join(',#tile');
            self.tile.$draggable = $(dragSel);
        },
        
        handleMove: function(self, e, callback) {
            var $clicked = $(e.target),
                emptyPosition = self.getEmptyPosition(self.tile.emptyIndex),
                clickedId = $clicked.data('id'),
                clickedIndex = _.indexOf(self.tile.order, clickedId),
                emptyIndex = _.indexOf(self.tile.order, self.tile.emptyId);
            
            // move clicked tile to empty position
            $clicked.css({
                top: emptyPosition[1] +'px',
                left: emptyPosition[0] +'px'
            });
            
            // move tile in the board
            self.tile.order[emptyIndex] = clickedId;
            self.tile.order[clickedIndex] = self.tile.emptyId;
            self.tile.emptyIndex = clickedIndex;
            
            // callback
            callback.call(self);
        },
        
        handleTurn: function() {
            var self = this;
            
            self.newTurn();
            
            // reset draggable tiles
            self.tile.$els.removeClass('draggable').unbind('click');
            
            // evaluate game
            if (self.tile.order.join('-') === self.board.finished.join('-')) {
                self.finishedGame();
            } else {
                // grab draggable tiles
                self.getDraggableTiles();

                // handle move
                self.tile.$draggable
                    .addClass('draggable')
                    .click(function(e) {
                        self.handleMove(self, e, function() {
                            self.handleTurn();
                        });
                    });
            }
        },
        
        newTurn: function() {
            var self = this;
            
            self.turn.counter++;
            
            self.turn.$el.text(self.turn.counter);
        },
        
        finishedGame: function() {
            var self = this,
                val = (self.board.x * self.board.y) - 1,
                x = (val % self.board.x) * self.tile.width,
                y = Math.floor((val / self.board.x)) * self.tile.height,
                bgPosition = '-'+ x +'px -'+ y +'px',
                top = Math.floor((val / self.board.x)) * self.tile.height,
                left = (val % self.board.x) * self.tile.width,
                width = self.tile.width - (self.tile.border * 2),
                height = self.tile.height - (self.tile.border * 2),
                $lastTile = '<div style="top: '+ top +'px; left: '+ left +'px; background-image: url('+ self.board.img +'); background-position:'+ bgPosition +'; width:'+ width +'px; height:'+ height +'px;" />';
                
            self.board.$el.append($lastTile);
            alert('OK');
        },
        
        /**
         * Returns position of element from left and top
         * @param {jQuery} $el jQuery element
         * @return {array} The left and right position of clicked tile from the board [left, top] (both integers)
         */
        getPosition: function($el) {
            return [parseInt($el.css('left'), 10), parseInt($el.css('top'), 10)];
        },
        
        /**
         * Returns position of virtual empty tile from left and top
         * @param {int} index Index of virtual empty tile
         * @return {array} The left and right position of virtual empty tile from the board [left, top] (both integers)
         */
        getEmptyPosition: function(index) {
            var self = this;
            return [(index % self.board.x) * self.tile.width, Math.floor((index / self.board.x)) * self.tile.height];
        },
        
        
        newGame: function(img) {
            var self = this;
            
            $('body').append($('<canvas width="500" height="500" />'));

            var canvas = $('canvas').get(0),
                c = canvas.getContext('2d'),
                $img = $('<img />')
                    .load(function() {
                        c.drawImage($img.get(0),0,0,500,500);
                        var img = canvas.toDataURL('image/png');

                        var bigGame = window.confirm('Chcete hrát větší variantu?'),
                            res = 3;
                        if (bigGame) {
                            res = 4;
                        }
                        self.createBoard(img, 500, 500, res, res);
                        self.handleTurn();
                    })
                    .attr('src', img);

            $(canvas).remove();
        }
    
    });
  
  
    /* ----------------------------------------------------------------
        Init
    ---------------------------------------------------------------- */
    $.game.init();

})(jQuery);