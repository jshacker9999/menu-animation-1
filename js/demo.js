var cancelFrame =
  window.cancelAnimationFrame || window.cancelRequestAnimationFrame;
var requestFrame = window.requestAnimationFrame;
var time =
  !window.performance || !window.performance.now
    ? function () {
        return +new Date();
      }
    : function () {
        return performance.now();
      };

var distance = function (points) {
  var p1 = points[0];
  var p2 = points[1];
  var a = p2.x - p1.x;
  var b = p2.y - p1.y;
  return Math.sqrt(a * a + b * b);
};

var circleMath = {
  parseRotate: function (rotation, self) {
    var sin = Math.sin(rotation),
      cos = Math.cos(rotation);
    var sin_cos = sin * cos;
    var angle = (180 / Math.PI) * rotation - 180;
    var lastAngle = angle;

    lastAngle = angle + self.yr * (sin_cos / (Math.PI + 1));

    return lastAngle;
  },

  parseSXY: function (rotation, self) {
    var farScale = self.farScale;
    var itemWidth = self.itemWidth;
    var xs = self.xs;
    var xr = self.xr;
    var ys = self.ys;
    var yr = self.yr;
    var sin = Math.sin(rotation),
      cos = Math.cos(rotation);
    var scale = farScale + (1 - farScale) * (sin + 1) * 0.5;

    var x = xs + cos * xr - itemWidth * 0.5;
    var y = ys + sin * yr - itemWidth * 0.5;
    var distanceNumber = distance([
      {
        x: self.$rotation.width() / 2 - self.$item.width() / 2,
        y: self.$rotation.height() / 2 - self.$item.height() / 2,
      },
      { x: x, y: y },
    ]);

    return {
      x: x,
      y: y,
      scale: scale,
      distanceNumber: distanceNumber,
    };
  },
};

var Rotation3D = (window.Rotation3D = function (_opts) {
  var self = this;
  this.$rotation = $(_opts.id);
  this.$lineList = this.$rotation.find(".lineList");
  this.$item = this.$rotation.find(".rotation3D__item");
  this.$line = this.$rotation.find(".rotation3D__line");
  this.itemWidth = this.$item.width();
  this.itemHeight = this.$item.height();
  this.length = this.$item.length;

  this.rotation = Math.PI / 2;
  this.destRotation = this.rotation;

  var xr = this.$rotation.width() * 0.5;
  var yr = this.$rotation.height() * 0.5;
  var xRadius = _opts.xRadius || 0;
  var yRadius = _opts.yRadius || 0;

  var opts = Object.assign(
    {
      farScale: 1,
      xs: xr,
      ys: yr,
      xr: xr - xRadius,
      yr: yr - yRadius,

      autoPlay: false,
      autoPlayDelay: 3000,
      currenIndex: -1,
      fps: 30,
      speed: 4,
    },
    _opts
  );
  Object.assign(this, opts);

  this.$item.each(function (index) {
    $(this).click(function () {
      $(this).addClass("active").siblings().removeClass("active");
      self.goTo(index);
    });
  });

  this.$rotation.mouseenter(function () {
    clearInterval(self.autoPlayTimer);
  });
  this.$rotation.mouseleave(function () {
    self.onAutoPlay();
  });

  this.onAutoPlay();
  this.onDrag();
  this.render();
});

Rotation3D.prototype.itemStyle = function ($item, index, rotation) {
  var parseSXY = circleMath.parseSXY(rotation, this);
  var scale = parseSXY.scale;
  var x = parseSXY.x;
  var y = parseSXY.y;
  var $line = this.$lineList.find(".rotation3D__line").eq(index);

  $item.find(".scale").css({
    transform: `scale(${scale})`,
  });
  $item.css({
    position: "absolute",
    display: "inline-block",

    "z-index": parseInt(scale * 100),
    "transform-origin": "0px 0px",

    transform: `translate(${x}px, ${y}px)`,
  });

  $line.css({
    height: parseSXY.distanceNumber,
  });
  $line.find("svg").css({
    height: parseSXY.distanceNumber,
  });
  $line.find(".dot1").css({
    "offset-path": `path("M0 ${parseSXY.distanceNumber}, 0 0")`,
  });
  $line.find("#path1").attr({
    d: `M0 ${parseSXY.distanceNumber}, 0 0`,
  });

  $line.find(".dot2").css({
    "offset-path": `path("M0 ${parseSXY.distanceNumber / 2}, 0 0")`,
  });
  $line.find("#path2").attr({
    d: `M0 ${parseSXY.distanceNumber}, 0 0`,
  });

  $line.find(".dot3").css({
    "offset-path": `path("M20 ${parseSXY.distanceNumber} S 0 ${
      parseSXY.distanceNumber / 2
    }, 20 0")`,
  });
  $line.find("#path3").attr({
    d: `M20 ${parseSXY.distanceNumber} S 0 ${
      parseSXY.distanceNumber / 2
    }, 20 0`,
  });

  $line.find(".dot4").css({
    "offset-path": `path("M20 0 S 40 ${parseSXY.distanceNumber / 2}, 20 ${
      parseSXY.distanceNumber
    }")`,
  });
  $line.find("#path4").attr({
    d: `M20 0 S 40 ${parseSXY.distanceNumber / 2}, 20 ${
      parseSXY.distanceNumber
    }`,
  });
};

Rotation3D.prototype.lineStyle = function ($line, index, rotation) {
  var rotate = circleMath.parseRotate(rotation, this);

  $line.css({
    transform: "rotate(" + rotate + "deg)",
  });
  this.$lineList.css({});
};

Rotation3D.prototype.goTo = function (index) {
  var self = this;
  this.currenIndex = index;
  console.log("currenIndex", index);

  var itemsRotated =
    (this.length * (Math.PI / 2 - this.rotation)) / (2 * Math.PI);
  var floatIndex = itemsRotated % this.length;
  if (floatIndex < 0) {
    floatIndex = floatIndex + this.length;
  }

  var diff = index - (floatIndex % this.length);
  if (2 * Math.abs(diff) > this.length) {
    diff -= diff > 0 ? this.length : -this.length;
  }

  this.destRotation += ((2 * Math.PI) / this.length) * -diff;
  this.scheduleNextFrame();
};

Rotation3D.prototype.scheduleNextFrame = function () {
  var self = this;
  this.lastTime = time();

  var pause = function () {
    cancelFrame ? cancelFrame(this.timer) : clearTimeout(self.timer);
    self.timer = 0;
  };

  var playFrame = function () {
    var rem = self.destRotation - self.rotation;
    var now = time(),
      dt = (now - self.lastTime) * 0.002;
    self.lastTime = now;

    if (Math.abs(rem) < 0.003) {
      self.rotation = self.destRotation;
      pause();
    } else {
      self.rotation = self.destRotation - rem / (1 + self.speed * dt);
      self.scheduleNextFrame();
    }
    self.render();
  };

  this.timer = cancelFrame
    ? requestFrame(playFrame)
    : setTimeout(playFrame, 1000 / this.fps);
};

Rotation3D.prototype.render = function () {
  var self = this;

  var spacing = (2 * Math.PI) / this.$item.length;
  var itemRotation = this.rotation;
  var lineRotation = this.rotation + Math.PI / 2;

  this.$item.each(function (index) {
    self.itemStyle($(this), index, itemRotation);
    itemRotation += spacing;
  });
  this.$line.each(function (index) {
    self.lineStyle($(this), index, lineRotation);
    lineRotation += spacing;
  });
};

Rotation3D.prototype.onAutoPlay = function () {
  var self = this;

  if (this.autoPlay) {
    this.autoPlayTimer = setInterval(function () {
      if (self.currenIndex < 0) {
        self.currenIndex = self.length - 1;
      }
      self.goTo(self.currenIndex);
      self.currenIndex--;
    }, this.autoPlayDelay);
  }
};

Rotation3D.prototype.onDrag = function () {
  var self = this;
  var startX, startY, moveX, moveY, endX, endY;

  this.$rotation.mousedown(function (e) {
    startX = e.pageX;
    startY = e.pageY;

    $(document).mousemove(function (e) {
      endX = e.pageX;
      endY = e.pageY;
      moveX = endX - startX;
      moveY = endY - startY;
    });

    $(document).mouseup(function (e) {
      endX = e.pageX;
      endY = e.pageY;
      moveX = endX - startX;
      moveY = endY - startY;

      var moveIndex = parseInt(Math.abs(moveX) / 50);
      console.log("moveIndex", moveIndex);
      if (moveIndex > 0) {
        if (moveX < 0) {
          self.currenIndex = self.currenIndex - moveIndex;
          play(moveIndex);
        } else {
          self.currenIndex = self.currenIndex + moveIndex;
          play(moveIndex);
        }
      }

      $(document).unbind("mousemove");
      $(document).unbind("mouseup");
    });
  });

  function play() {
    if (self.currenIndex == 0) {
      self.currenIndex = self.length - 1;
    }
    self.goTo(self.currenIndex % self.length);
  }
};
var app = new Vue({
  el: "#app",

  data: {
    itemList: [
      {
        name: "Personnel management",
        type: "blue",
        icon: "icon-renyuanguanli",
      },
      { name: "GPS service", type: "green", icon: "icon-GPS" },
      {
        name: "Subgrade construction",
        type: "yellow",
        icon: "icon-a-lujishigong2x",
      },
      {
        name: "Data service center",
        type: "blue",
        icon: "icon-shujufuwuzhongxin",
      },
      { name: "IT", type: "blue", icon: "icon-liangchang" },
      {
        name: "Paving and Compaction Services",
        type: "blue",
        icon: "icon-tanpuyashifuwu",
      },
      {
        name: "Pavement construction",
        type: "blue",
        icon: "icon-lumianshigong",
      },
      { name: "Test detection", type: "blue", icon: "icon-shiyanjiance" },
    ],
  },
  mounted: function () {
    new Rotation3D({
      id: "#rotation3D",
      farScale: 0.6,

      xRadius: 0,
      yRadius: 220,
    });
  },
  methods: {},
});
