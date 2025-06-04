const startBtn = document.getElementById("start-btn");
const canvas = document.getElementById("canvas");
const startScreen = document.querySelector(".start-screen");
const checkpointScreen = document.querySelector(".checkpoint-screen");
const checkpointMessage = document.querySelector(".checkpoint-screen > p");
const checkpointProgress = document.getElementById("checkpoint-progress");
const restartScreen = document.querySelector(".restart-screen");
const restartBtn = document.getElementById("restart-btn");
const livesContainer = document.getElementById("lives");
const jumpSound = new Audio("jump.wav");
const checkpointSound = new Audio("checkpoint.wav");
const goalSound = new Audio("goal.wav");

const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;
const gravity = 0.5;
let isCheckpointCollisionDetectionActive = true;
let lives = 3;

const proportionalSize = (size) => {
    return innerHeight < 500 ? Math.ceil((size / 500) * innerHeight) : size;
};

class Player {
    constructor() {
        this.position = { x: proportionalSize(10), y: proportionalSize(400) };
        this.velocity = { x: 0, y: 0 };
        this.width = proportionalSize(40);
        this.height = proportionalSize(40);
    }

    draw() {
        ctx.save();
        ctx.fillStyle = "#00d4ff";
        ctx.shadowColor = "#00d4ff";
        ctx.shadowBlur = 15;
        if (this.velocity.y < 0) {
            ctx.beginPath();
            ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        }
        ctx.restore();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.position.y + this.height + this.velocity.y <= canvas.height) {
            if (this.position.y < 0) {
                this.position.y = 0;
                this.velocity.y = gravity;
            }
            this.velocity.y += gravity;
        } else {
            this.velocity.y = 0;
        }

        if (this.position.x < this.width) {
            this.position.x = this.width;
        }

        if (this.position.x >= canvas.width - this.width * 2) {
            this.position.x = canvas.width - this.width * 2;
        }
    }
}

class Platform {
    constructor(x, y) {
        this.position = { x, y };
        this.width = 200;
        this.height = proportionalSize(40);
    }

    draw() {
        ctx.save();
        ctx.fillStyle = "#00d4ff";
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#00d4ff";
        ctx.shadowBlur = 10;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
        ctx.restore();
    }
}

class CheckPoint {
    constructor(x, y, z) {
        this.position = { x, y };
        this.width = proportionalSize(40);
        this.height = proportionalSize(70);
        this.claimed = false;
        this.scale = 1;
    }

    draw() {
        if (!this.claimed) {
            ctx.save();
            ctx.fillStyle = "#ff3d00";
            ctx.strokeStyle = "#ff3d00";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#ff3d00";
            ctx.shadowBlur = 15;
            ctx.fillRect(this.position.x, this.position.y, this.width * this.scale, this.height * this.scale);
            ctx.strokeRect(this.position.x, this.position.y, this.width * this.scale, this.height * this.scale);
            ctx.restore();
        }
    }

    claim() {
        this.claimed = true;
        let animationFrame;
        const particles = [];
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                radius: Math.random() * 4 + 2,
                alpha: 1
            });
        }
        const animateParticles = () => {
            ctx.save();
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.02;
                ctx.fillStyle = `rgba(255, 61, 0, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
            if (particles.some(p => p.alpha > 0)) {
                animationFrame = requestAnimationFrame(animateParticles);
            } else {
                cancelAnimationFrame(animationFrame);
            }
        };
        animateParticles();
        const animateShrink = () => {
            if (this.scale > 0.01) {
                this.scale -= 0.01;
                animationFrame = requestAnimationFrame(animateShrink);
            } else {
                cancelAnimationFrame(animationFrame);
                this.width = 0;
                this.height = 0;
                this.position.y = Infinity;
            }
        };
        animateShrink();
    }
}

class Enemy {
    constructor(x, y, vertical = false) {
        this.position = { x, y };
        this.width = proportionalSize(40);
        this.height = proportionalSize(40);
        this.speed = 2;
        this.direction = 1;
        this.vertical = vertical;

        if (vertical) {
            this.minY = y - 50;
            this.maxY = y + 50;
        }
    }

    setBounds(minX, maxX) {
        this.minX = minX;
        this.maxX = maxX;
    }

    draw() {
        ctx.save();
        ctx.fillStyle = "#ff3d00";
        ctx.strokeStyle = "#ff3d00";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ff3d00";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(this.position.x + this.width / 2, this.position.y);
        ctx.lineTo(this.position.x + this.width, this.position.y + this.height);
        ctx.lineTo(this.position.x, this.position.y + this.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    update() {
        this.draw();

        if (this.vertical) {
            this.position.y += this.speed * this.direction;
            if (this.position.y <= this.minY || this.position.y + this.height >= this.maxY) {
                this.direction *= -1;
            }
        } else {
            this.position.x += this.speed * this.direction;
            if (this.position.x <= this.minX || this.position.x + this.width >= this.maxX) {
                this.direction *= -1;
            }
        }
    }
}

const player = new Player();

const platformPositions = [
    { x: 500, y: proportionalSize(450) },
    { x: 700, y: proportionalSize(400) },
    { x: 850, y: proportionalSize(350) },
    { x: 900, y: proportionalSize(350) },
    { x: 1050, y: proportionalSize(150) },
    { x: 2500, y: proportionalSize(450) },
    { x: 2900, y: proportionalSize(400) },
    { x: 3150, y: proportionalSize(350) },
    { x: 3900, y: proportionalSize(450) },
    { x: 4200, y: proportionalSize(400) },
    { x: 4400, y: proportionalSize(200) },
    { x: 4700, y: proportionalSize(150) },
];

const platforms = platformPositions.map(p => new Platform(p.x, p.y));

const checkpointPositions = [
    { x: 1170, y: proportionalSize(80), z: 1 },
    { x: 2900, y: proportionalSize(330), z: 2 },
    { x: 4800, y: proportionalSize(80), z: 3 },
];

const checkpoints = checkpointPositions.map(c => new CheckPoint(c.x, c.y, c.z));

const enemies = [];

const enemy1 = new Enemy(1400, proportionalSize(410));
enemy1.setBounds(1400, 1600);
enemies.push(enemy1);

const enemy2 = new Enemy(3300, proportionalSize(310));
enemy2.setBounds(3300, 3550);
enemies.push(enemy2);

const spawnEnemiesForCheckpoint = (index) => {
    if (index === 0) return;
    for (let i = 0; i < index * 2; i++) {
        const x = 1000 + Math.random() * 3000;
        const y = proportionalSize(400 - Math.random() * 200);
        const vertical = Math.random() > 0.5;
        const enemy = new Enemy(x, y, vertical);
        if (!vertical) {
            enemy.setBounds(x - 100, x + 100);
        }
        enemies.push(enemy);
    }
};

const updateLives = () => {
    const hearts = livesContainer.querySelectorAll(".heart");
    hearts.forEach((heart, index) => {
        if (index < lives) {
            heart.classList.remove("lost");
        } else {
            heart.classList.add("lost");
        }
    });
};

const animate = () => {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => p.draw());
    checkpoints.forEach(cp => cp.draw());
    enemies.forEach(enemy => enemy.update());
    player.update();

    if (keys.rightKey.pressed && player.position.x < proportionalSize(400)) {
        player.velocity.x = 5;
    } else if (keys.leftKey.pressed && player.position.x > proportionalSize(100)) {
        player.velocity.x = -5;
    } else {
        player.velocity.x = 0;

        if (keys.rightKey.pressed && isCheckpointCollisionDetectionActive) {
            platforms.forEach(p => p.position.x -= 5);
            checkpoints.forEach(cp => cp.position.x -= 5);
            enemies.forEach(e => {
                e.position.x -= 5;
                if (!e.vertical) {
                    e.minX -= 5;
                    e.maxX -= 5;
                }
            });
        } else if (keys.leftKey.pressed && isCheckpointCollisionDetectionActive) {
            platforms.forEach(p => p.position.x += 5);
            checkpoints.forEach(cp => cp.position.x += 5);
            enemies.forEach(e => {
                e.position.x += 5;
                if (!e.vertical) {
                    e.minX += 5;
                    e.maxX += 5;
                }
            });
        }
    }

    platforms.forEach(p => {
        const above = player.position.y + player.height <= p.position.y;
        const fallingOnto = player.position.y + player.height + player.velocity.y >= p.position.y;
        const withinX = player.position.x >= p.position.x - player.width / 2 &&
            player.position.x <= p.position.x + p.width - player.width / 3;

        if (above && fallingOnto && withinX) {
            player.velocity.y = 0;
            return;
        }

        const overlappingY = player.position.y + player.height >= p.position.y &&
            player.position.y <= p.position.y + p.height;

        if (withinX && overlappingY) {
            player.position.y = p.position.y + player.height;
            player.velocity.y = gravity;
        }
    });

    checkpoints.forEach((checkpoint, index, checkpoints) => {
        const validCollision = player.position.x >= checkpoint.position.x &&
            player.position.y >= checkpoint.position.y &&
            player.position.y + player.height <= checkpoint.position.y + checkpoint.height &&
            isCheckpointCollisionDetectionActive &&
            player.position.x - player.width <= checkpoint.position.x - checkpoint.width + player.width * 0.9 &&
            (index === 0 || checkpoints[index - 1].claimed);

        if (validCollision) {
            checkpoint.claim();

            const claimedCount = checkpoints.filter(cp => cp.claimed).length;
            checkpointProgress.textContent = `Node: ${claimedCount} of ${checkpoints.length}`;

            checkpointSound.currentTime = 0;
            checkpointSound.play();

            spawnEnemiesForCheckpoint(index);

            if (index === checkpoints.length - 1) {
                goalSound.currentTime = 0;
                goalSound.play();

                isCheckpointCollisionDetectionActive = false;
                showCheckpointScreen("Grid Mastered!");
                movePlayer("ArrowRight", 0, false);
                restartScreen.style.display = "block";
            } else {
                showCheckpointScreen("Node Synced!");
            }
        }
    });

    enemies.forEach(enemy => {
        const isColliding =
            player.position.x < enemy.position.x + enemy.width &&
            player.position.x + player.width > enemy.position.x &&
            player.position.y < enemy.position.y + enemy.height &&
            player.position.y + player.height > enemy.position.y;

        if (isColliding && isCheckpointCollisionDetectionActive) {
            lives--;
            updateLives();
            if (lives <= 0) {
                showCheckpointScreen("System Crash!");
                isCheckpointCollisionDetectionActive = false;
                restartScreen.style.display = "block";
            } else {
                player.position.x = proportionalSize(10);
                player.position.y = proportionalSize(400);
                player.velocity.x = 0;
                player.velocity.y = 0;
            }
        }
    });
};

const keys = {
    rightKey: { pressed: false },
    leftKey: { pressed: false },
};

const movePlayer = (key, xVelocity, isPressed) => {
    if (!isCheckpointCollisionDetectionActive) {
        player.velocity.x = 0;
        player.velocity.y = 0;
        return;
    }

    switch (key) {
        case "ArrowLeft":
            keys.leftKey.pressed = isPressed;
            if (xVelocity === 0) player.velocity.x = 0;
            player.velocity.x -= xVelocity;
            break;
        case "ArrowUp":
        case " ":
        case "Spacebar":
            player.velocity.y -= 8;
            jumpSound.currentTime = 0;
            jumpSound.play();
            break;
        case "ArrowRight":
            keys.rightKey.pressed = isPressed;
            if (xVelocity === 0) player.velocity.x = 0;
            player.velocity.x += xVelocity;
            break;
    }
};

const startGame = () => {
    canvas.style.display = "block";
    startScreen.style.display = "none";
    animate();
};

const showCheckpointScreen = (msg) => {
    checkpointScreen.style.display = "block";
    checkpointMessage.textContent = msg;
    if (isCheckpointCollisionDetectionActive) {
        setTimeout(() => (checkpointScreen.style.display = "none"), 2000);
    }
};

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => location.reload());
window.addEventListener("keydown", ({ key }) => movePlayer(key, 8, true));
window.addEventListener("keyup", ({ key }) => movePlayer(key, 0, false));

updateLives();