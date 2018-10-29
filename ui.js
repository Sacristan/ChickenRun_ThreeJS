var c;
var ctx;

window.onload = function () {
    c = document.getElementById("uiContainer");
    ctx = c.getContext("2d");
    updateUI();
};

function updateUI() {
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;

    ctx.beginPath();
    ctx.arc(100, 75, 50, 0, 2 * Math.PI);

    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.closePath();
};
