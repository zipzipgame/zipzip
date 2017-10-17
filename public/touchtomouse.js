/** Calls mouse events on touch events. Overrides multitouch event when gestures is false. */
function singleTouchToMouse(canvas, gestures) {
    var touch = false;
    var touchId;
    canvas.ontouchmove = function(e) {
        if(gestures && e.touches.length > 1) {
            return true;
        }
        for(var i = 0; i < e.touches.length; i++) {
            if(!touch) {
                touch = true;
                touchId = e.touches[i].identifier;
                if(!("preventDefault" in e.touches[i])) e.touches[i].preventDefault = function() {};
                canvas.onmousedown(e.touches[i]);
                break;
            } else {
                if(touchId == e.touches[i].identifier) {
                    if(!("preventDefault" in e.touches[i])) e.touches[i].preventDefault = function() {};
                    canvas.onmousemove(e.touches[i]);
                    break;
                }
            }
        }
        return false;
    }
    canvas.ontouchend = function(e) {
        for(var i = 0; i < e.changedTouches.length; i++) {
            if(touch && e.changedTouches[i].identifier == touchId) {
                if(!("preventDefault" in e.changedTouches[i])) e.changedTouches[i].preventDefault = function() {};
                canvas.onmouseup(e.changedTouches[i]);
                touch = false;
                break;
            }
        }
    }
}
