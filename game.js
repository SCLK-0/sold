// One Last Game - Soul Knight Style
// Main character: Hebrado (nerdy dude with glasses)
// Boss: Pineda (curly hair)

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'playing'; // playing, bossDefeated, gameOver
        this.camera = { x: 0, y: 0 };
        
        // Initialize game objects
        this.player = new Player(100, 100);
        this.boss = new Boss(600, 300);
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.zoom = 1; // default zoom

        
        // Input handling
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        // Mobile touch controls
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       ('ontouchstart' in window) || 
                       (navigator.maxTouchPoints > 0);
        this.touchControls = {
            moveJoystick: { active: false, x: 0, y: 0, centerX: 0, centerY: 0 },
            shootArea: { active: false }
        };
        
        this.setupEventListeners();
        
        // Initial mobile setup
        if (this.isMobile) {
            setTimeout(() => {
                this.handleResize();
                // Show mobile controls
                const mobileControls = document.getElementById('mobileControls');
                if (mobileControls) {
                    mobileControls.style.display = 'flex';
                }
            }, 100);
        }
        
        this.gameLoop();
    }

    
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left + this.camera.x;
            this.mouse.y = e.clientY - rect.top + this.camera.y;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.down = false;
        });

        // Mobile touch controls
        if (this.isMobile) {
            this.setupMobileControls();
        }

        // Resize handler for mobile
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

setupMobileControls() {
    const moveArea = document.getElementById('moveControls');
    const moveStick = document.getElementById('moveJoystick');
    const shootArea = document.getElementById('shootControls');
    const shootStick = document.getElementById('shootJoystick');

    let moveTouch = null;
    let shootTouch = null;

    const maxDist = 50;

    // --- MOVE JOYSTICK ---
    moveArea.addEventListener('touchstart', e => {
        moveTouch = e.touches[0];
    });

    moveArea.addEventListener('touchmove', e => {
        if (!moveTouch) return;
        const touch = [...e.touches].find(t => t.identifier === moveTouch.identifier);
        if (!touch) return;

        const rect = moveArea.getBoundingClientRect();
        const dx = touch.clientX - (rect.left + rect.width / 2);
        const dy = touch.clientY - (rect.top + rect.height / 2);
        const dist = Math.min(maxDist, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);

        this.player.vx = Math.cos(angle) * (dist / maxDist) * this.player.speed;
        this.player.vy = Math.sin(angle) * (dist / maxDist) * this.player.speed;

        moveStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });

    moveArea.addEventListener('touchend', () => {
        moveTouch = null;
        this.player.vx = 0;
        this.player.vy = 0;
        moveStick.style.transform = 'translate(-50%, -50%)';
    });

    // --- SHOOT JOYSTICK ---
    shootArea.addEventListener('touchstart', e => {
        shootTouch = e.touches[0];
        this.player.isShooting = true;
    });

    shootArea.addEventListener('touchmove', e => {
        if (!shootTouch) return;
        const touch = [...e.touches].find(t => t.identifier === shootTouch.identifier);
        if (!touch) return;

        const rect = shootArea.getBoundingClientRect();
        const dx = touch.clientX - (rect.left + rect.width / 2);
        const dy = touch.clientY - (rect.top + rect.height / 2);
        const dist = Math.min(maxDist, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);

        // visually move joystick knob
        shootStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // gameplay direction
        this.player.shootAngle = angle;
        this.player.isShooting = dist > 10; // only shoot if pulled enough
    });

    shootArea.addEventListener('touchend', () => {
        shootTouch = null;
        this.player.isShooting = false;
        shootStick.style.transform = 'translate(-50%, -50%)';
    });
}


    updateJoystick(touch) {
        const centerX = this.touchControls.moveJoystick.centerX;
        const centerY = this.touchControls.moveJoystick.centerY;
        const maxDistance = 35; // Half of joystick area minus joystick size

        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }

        this.touchControls.moveJoystick.x = deltaX / maxDistance;
        this.touchControls.moveJoystick.y = deltaY / maxDistance;

        // Update joystick visual position
        const moveJoystick = document.getElementById('moveJoystick');
        moveJoystick.style.transform = `translate(${-50 + deltaX}%, ${-50 + deltaY}%)`;

        // Convert joystick input to keyboard input
        const threshold = 0.3;
        this.keys['w'] = this.touchControls.moveJoystick.y < -threshold;
        this.keys['s'] = this.touchControls.moveJoystick.y > threshold;
        this.keys['a'] = this.touchControls.moveJoystick.x < -threshold;
        this.keys['d'] = this.touchControls.moveJoystick.x > threshold;
    }

    handleResize() {
        // Adjust canvas size for mobile
        if (this.isMobile) {
            const container = document.getElementById('gameContainer');
            const canvas = this.canvas;
            const containerRect = container.getBoundingClientRect();
            
            // Maintain aspect ratio while fitting mobile screen
            const aspectRatio = 800 / 600;
            let newWidth = containerRect.width;
            let newHeight = containerRect.width / aspectRatio;
            
            if (newHeight > containerRect.height * 0.6) {
                newHeight = containerRect.height * 0.6;
                newWidth = newHeight * aspectRatio;
            }
            
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update player
        this.player.update(this.keys, this.mouse);
        
        // Update boss
        this.boss.update(this.player);
        
        // Update bullets
        this.bullets.forEach((bullet, index) => {
            bullet.update();
            if (bullet.shouldRemove()) {
                this.bullets.splice(index, 1);
            }
        });
        
        // Update enemy bullets
        this.enemyBullets.forEach((bullet, index) => {
            bullet.update();
            if (bullet.shouldRemove()) {
                this.enemyBullets.splice(index, 1);
            }
        });
        
        // Update particles
        this.particles.forEach((particle, index) => {
            particle.update();
            if (particle.shouldRemove()) {
                this.particles.splice(index, 1);
            }
        });
        
        // Player shooting
        if (this.mouse.down && this.player.canShoot()) {
            let angle;
            if (this.isMobile && this.touchControls.shootArea.active) {
                // On mobile, shoot towards the nearest enemy (boss)
                const dx = this.boss.x - this.player.x;
                const dy = this.boss.y - this.player.y;
                angle = Math.atan2(dy, dx);
            } else {
                // Normal mouse/touch aiming
                angle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
            }
            this.bullets.push(new Bullet(this.player.x, this.player.y, angle, 'player'));
            this.player.lastShot = Date.now();
        }
        
        // Boss shooting with new attack patterns
        if (this.boss.canShoot()) {
            this.boss.executeShootingPattern(this);
            this.boss.lastShot = Date.now();
        }
        
        // Collision detection
        this.checkCollisions();
        
        // Update camera
        this.updateCamera();
        
        // Update UI
        this.updateUI();

        if (this.player.isShooting && this.player.shootAngle !== undefined) {
    this.shootProjectile(this.player.x, this.player.y, this.player.shootAngle);
}

    }
    
    checkCollisions() {
        // Player bullets vs Boss
        this.bullets.forEach((bullet, bulletIndex) => {
            if (this.boss.isHit(bullet.x, bullet.y)) {
                this.boss.takeDamage(8);
                this.bullets.splice(bulletIndex, 1);
                
                // Add hit particles
                for (let i = 0; i < 5; i++) {
                    this.particles.push(new Particle(bullet.x, bullet.y, 'hit'));
                }
                
                if (this.boss.health <= 0) {
                    this.gameState = 'bossDefeated';
                    // Add victory particles
                    for (let i = 0; i < 20; i++) {
                        this.particles.push(new Particle(this.boss.x, this.boss.y, 'victory'));
                    }
                }
            }
        });
        
        // Enemy bullets vs Player
        this.enemyBullets.forEach((bullet, bulletIndex) => {
            if (this.player.isHit(bullet.x, bullet.y)) {
                this.player.takeDamage(20);
                this.enemyBullets.splice(bulletIndex, 1);
                
                // Add hit particles
                for (let i = 0; i < 3; i++) {
                    this.particles.push(new Particle(bullet.x, bullet.y, 'playerHit'));
                }
                
                if (this.player.health <= 0) {
                    this.gameState = 'gameOver';
                }
            }
        });
    }
    
   updateCamera() {
    // Get the actual canvas size being displayed (after scaling)
    const canvas = this.ctx.canvas;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Fallback for when client size isn’t yet applied
    const viewWidth = displayWidth || this.width;
    const viewHeight = displayHeight || this.height;

    // Smooth camera follow
    this.camera.x += (this.player.x - viewWidth / 2 - this.camera.x) * 0.1;
    this.camera.y += (this.player.y - viewHeight / 2 - this.camera.y) * 0.1;

    // Define your actual map boundaries
    const mapWidth = 1000;
    const mapHeight = 800;

    // Clamp camera so it doesn’t go past edges
    this.camera.x = Math.max(0, Math.min(this.camera.x, mapWidth - viewWidth));
    this.camera.y = Math.max(0, Math.min(this.camera.y, mapHeight - viewHeight));
}

    
    updateUI() {
        document.getElementById('health').textContent = Math.max(0, this.player.health);
        const bossHealthUI = document.getElementById('bossHealth');
        if (this.boss.health > 0) {
            bossHealthUI.style.display = 'block';
            bossHealthUI.textContent = `Pineda Health: ${Math.max(0, this.boss.health)}`;
        } else {
            bossHealthUI.style.display = 'none';
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Save context for camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw dungeon background
        this.drawDungeon();
        
        // Draw game objects
        this.player.draw(this.ctx);
        this.boss.draw(this.ctx);
        
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.enemyBullets.forEach(bullet => bullet.draw(this.ctx));
        this.particles.forEach(particle => particle.draw(this.ctx));
        
        // Restore context
        this.ctx.restore();
        
        // Draw game state messages
        this.drawGameStateMessages();
    }
    
 // --- DUNGEON MAP DESIGN REPLACEMENT ---
drawDungeon() {
    this.drawDungeonBase();
    this.drawDungeonWalls();
    this.drawDungeonDetails();
    this.drawDungeonLighting();
}

drawDungeonBase() {
    const ctx = this.ctx;
    const tileSize = 50;

    // If dungeon texture hasn't been created yet, make one and store it
    if (!this.dungeonTexture) {
        const offscreen = document.createElement('canvas');
        offscreen.width = 1000;
        offscreen.height = 800;
        const octx = offscreen.getContext('2d');

        // Base dark stone floor
        octx.fillStyle = '#111';
        octx.fillRect(0, 0, 1000, 800);

        // Textured stone tiles (only generated once)
       // Textured stone tiles (no seams)
for (let x = 0; x < 1000; x += tileSize) {
    for (let y = 0; y < 800; y += tileSize) {
        const shade = 20 + Math.random() * 20;
        octx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;

        // Use integer rounding to avoid subpixel seams
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        // Fill the full tile (no -1 or -2)
        octx.fillRect(tileX, tileY, tileSize + 1, tileSize + 1);

        // Optional cracks for realism
        if (Math.random() < 0.12) {
            octx.strokeStyle = 'rgba(60, 60, 60, 0.6)';
            octx.beginPath();
            octx.moveTo(tileX + Math.random() * tileSize, tileY + Math.random() * tileSize);
            octx.lineTo(tileX + Math.random() * tileSize, tileY + Math.random() * tileSize);
            octx.stroke();
        }
    }
}

        // Store texture for reuse
        this.dungeonTexture = offscreen;
    }

    // Draw the pre-rendered dungeon texture
    ctx.drawImage(this.dungeonTexture, 0, 0);
}


drawDungeonWalls() {
    const ctx = this.ctx;

    // Outer brick walls
    this.drawBrickWall(0, 0, 1000, 30); // top
    this.drawBrickWall(0, 770, 1000, 30); // bottom
    this.drawBrickWall(0, 0, 30, 800); // left
    this.drawBrickWall(970, 0, 30, 800); // right
}

drawBrickWall(x, y, width, height) {
    const ctx = this.ctx;
    const brickWidth = 30;
    const brickHeight = 15;

    // Dark brick color
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, width, height);

    // Brick lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += brickWidth) {
        for (let j = 0; j < height; j += brickHeight) {
            ctx.strokeRect(x + i, y + j, brickWidth, brickHeight);
        }
    }

    // Edge glow for dungeon feel
    const glow = ctx.createLinearGradient(x, y, x + width, y + height);
    glow.addColorStop(0, 'rgba(255, 0, 0, 0.1)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, width, height);
}

drawDungeonDetails() {
    const ctx = this.ctx;
    const decorations = [
        {x: 200, y: 150, type: 'torch'},
        {x: 800, y: 150, type: 'torch'},
        {x: 500, y: 400, type: 'skull'},
        {x: 300, y: 600, type: 'chain'},
        {x: 700, y: 600, type: 'torch'},
    ];

    decorations.forEach(d => this.drawDungeonDecoration(d.x, d.y, d.type));
}

drawDungeonDecoration(x, y, type) {
    const ctx = this.ctx;
    switch (type) {
        case 'torch':
            // Wall torch with flickering light
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 2, y, 4, 15);
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ff6600';
            ctx.fill();

            const flicker = 0.1 + Math.random() * 0.3;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
            gradient.addColorStop(0, `rgba(255, 150, 50, ${flicker})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - 50, y - 50, 100, 100);
            break;

        case 'skull':
            ctx.fillStyle = '#ccc';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 3, y - 1, 2, 2);
            ctx.fillRect(x + 1, y - 1, 2, 2);
            ctx.fillRect(x - 1, y + 2, 2, 1);
            break;

        case 'chain':
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(x, y + i * 10, 3, 0, Math.PI * 2);
                ctx.stroke();
            }
            break;
    }
}

drawDungeonLighting() {
    const ctx = this.ctx;
    const lights = [
        {x: 200, y: 150, radius: 80, color: 'rgba(255, 180, 100, 0.1)'},
        {x: 800, y: 150, radius: 80, color: 'rgba(255, 180, 100, 0.1)'},
        {x: 700, y: 600, radius: 60, color: 'rgba(255, 140, 60, 0.08)'},
    ];

    lights.forEach(light => {
        const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
        gradient.addColorStop(0, light.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
    });

    // Subtle fog overlay
    const fog = ctx.createRadialGradient(500, 400, 100, 500, 400, 500);
    fog.addColorStop(0, 'rgba(0,0,0,0)');
    fog.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, 1000, 800);
}

    
    drawMysticalLighting() {
        const ctx = this.ctx;
        
        // Add mystical forest ambient lighting
        const lightSources = [
            {x: 250, y: 250, radius: 60, color: 'rgba(0, 255, 100, 0.08)'},
            {x: 750, y: 250, radius: 50, color: 'rgba(100, 255, 255, 0.06)'},
            {x: 500, y: 500, radius: 80, color: 'rgba(255, 255, 150, 0.05)'},
            {x: 150, y: 600, radius: 40, color: 'rgba(255, 100, 255, 0.04)'},
            {x: 850, y: 600, radius: 45, color: 'rgba(150, 255, 150, 0.05)'}
        ];
        
        lightSources.forEach(light => {
            const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
            gradient.addColorStop(0, light.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
        });
        
        // Add floating mystical particles
        const time = Date.now() * 0.001;
        for (let i = 0; i < 12; i++) {
            const x = 100 + (i * 70) + Math.sin(time + i) * 30;
            const y = 200 + Math.sin(time * 0.7 + i * 0.5) * 100;
            const alpha = 0.3 + Math.sin(time * 2 + i) * 0.2;
            
            ctx.fillStyle = `rgba(100, 255, 150, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
drawGame() {
    const ctx = this.ctx;
    const canvas = ctx.canvas;

    // Always start clean
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // Apply zoom and camera position
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // --- Draw map and entities ---
    this.drawDungeon();
    this.drawEnemies();
    this.drawPlayer();
    this.drawProjectiles();

    ctx.restore();

    // --- Draw UI after restore ---
    this.drawUI();
}



    drawGameStateMessages() {
        this.ctx.save();
        this.ctx.font = '30px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'bossDefeated') {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillText('BOSS DEFEATED!', this.width / 2, this.height / 2);
            this.ctx.font = '16px Courier New';
            this.ctx.fillText('Hebrado has saved the day!', this.width / 2, this.height / 2 + 40);
        } else if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
            this.ctx.font = '16px Courier New';
            this.ctx.fillText('Press F5 to try again', this.width / 2, this.height / 2 + 40);
        }
        
        this.ctx.restore();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 2;
        this.health = 100;
        this.maxHealth = 100;
        this.lastShot = 0;
        this.shootCooldown = 200; // ms
        
        // Animation properties
        this.animationFrame = 0;
        this.animationSpeed = 8; // frames per animation cycle
        this.isMoving = false;
        this.facingDirection = 1; // 1 for right, -1 for left
        this.bobOffset = 0;
        this.armSwing = 0;
    }
    
    update(keys, mouse) {
        // Store mouse reference for weapon drawing
        this.mouse = mouse;
        
        // Track if player is moving for animations
        const wasMoving = this.isMoving;
        this.isMoving = false;
        
        const oldX = this.x;
        const oldY = this.y;
        
        // Movement
        if (keys['w'] || keys['arrowup']) {
            this.y -= this.speed;
            this.isMoving = true;
        }
        if (keys['s'] || keys['arrowdown']) {
            this.y += this.speed;
            this.isMoving = true;
        }
        if (keys['a'] || keys['arrowleft']) {
            this.x -= this.speed;
            this.isMoving = true;
            this.facingDirection = -1;
        }
        if (keys['d'] || keys['arrowright']) {
            this.x += this.speed;
            this.isMoving = true;
            this.facingDirection = 1;
        }
        
        // Keep player in bounds (fixed boundaries with proper wall thickness)
        this.x = Math.max(40, Math.min(this.x, 960));
        this.y = Math.max(40, Math.min(this.y, 760));
        
        // Update animations
        this.updateAnimations();
    }
    
    updateAnimations() {
        if (this.isMoving) {
            this.animationFrame += 1;
            
            // Walking bob effect
            this.bobOffset = Math.sin(this.animationFrame * 0.3) * 1;
            
            // Arm swing
            this.armSwing = Math.sin(this.animationFrame * 0.25) * 0.3;
        } else {
            // Gradually return to idle position
            this.bobOffset *= 0.9;
            this.armSwing *= 0.9;
            
            // Idle breathing animation
            this.animationFrame += 0.5;
        }
    }
    
    canShoot() {
        return Date.now() - this.lastShot > this.shootCooldown;
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    isHit(x, y) {
        return x > this.x - this.width/2 && x < this.x + this.width/2 &&
               y > this.y - this.height/2 && y < this.y + this.height/2;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Draw shadow first
        this.drawShadow(ctx);
        
        // Draw Hebrado (enhanced pixel art with 2.5D effect)
        // Body with depth
        this.drawPlayerBody(ctx);
        
        // Head with better detail
        this.drawPlayerHead(ctx);
        
        // Equipment and accessories
        this.drawPlayerEquipment(ctx);
        
        // Health bar with 3D effect
        this.drawPlayerHealthBar(ctx);
        
        ctx.restore();
    }
    
    drawShadow(ctx) {
        // Character shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.ellipse(this.x, this.y + 12, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawPlayerBody(ctx) {
        // Calculate animated positions
        const bodyY = this.y + this.bobOffset;
        const leftArmOffset = this.armSwing;
        const rightArmOffset = -this.armSwing;
        
        // Main body with gradient for 3D effect
        const bodyGradient = ctx.createLinearGradient(this.x - 10, bodyY - 10, this.x + 10, bodyY + 10);
        bodyGradient.addColorStop(0, '#6ab0f2');
        bodyGradient.addColorStop(0.5, '#4a90e2');
        bodyGradient.addColorStop(1, '#2a70c2');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(this.x - 9, bodyY - 9, 18, 18);
        
        // Body outline
        ctx.strokeStyle = '#1a50a2';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 9, bodyY - 9, 18, 18);
        
        // Shirt details
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - 6, bodyY - 6, 12, 2); // Collar
        ctx.fillRect(this.x - 1, bodyY - 4, 2, 8); // Button line
        
        // Animated arms with walking motion
        this.drawAnimatedArms(ctx, bodyY, leftArmOffset, rightArmOffset);
        
        // Animated legs
        this.drawAnimatedLegs(ctx, bodyY);
    }
    
    drawAnimatedArms(ctx, bodyY, leftArmOffset, rightArmOffset) {
        // Left arm with animation
        ctx.fillStyle = '#4a90e2';
        const leftArmY = bodyY - 6 + leftArmOffset;
        ctx.fillRect(this.x - 12, leftArmY, 4, 10);
        
        // Right arm with animation
        const rightArmY = bodyY - 6 + rightArmOffset;
        ctx.fillRect(this.x + 8, rightArmY, 4, 10);
        
        // Hands (holding weapon) with animation
        ctx.fillStyle = '#ffdbac';
        ctx.fillRect(this.x - 13, leftArmY + 4, 3, 3); // Left hand
        ctx.fillRect(this.x + 10, rightArmY + 4, 3, 3); // Right hand
    }
    
    drawAnimatedLegs(ctx, bodyY) {
        if (this.isMoving) {
            // Walking leg animation
            const legSwing = Math.sin(this.animationFrame * 0.4) * 2;
            const leftLegY = bodyY + 9 + Math.abs(legSwing);
            const rightLegY = bodyY + 9 + Math.abs(-legSwing);
            
            // Left leg
            ctx.fillStyle = '#2a70c2';
            ctx.fillRect(this.x - 6, leftLegY, 4, 8);
            
            // Right leg
            ctx.fillRect(this.x + 2, rightLegY, 4, 8);
            
            // Feet
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 7, leftLegY + 7, 6, 3);
            ctx.fillRect(this.x + 1, rightLegY + 7, 6, 3);
        } else {
            // Standing legs
            ctx.fillStyle = '#2a70c2';
            ctx.fillRect(this.x - 6, bodyY + 9, 4, 8);
            ctx.fillRect(this.x + 2, bodyY + 9, 4, 8);
            
            // Feet
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 7, bodyY + 16, 6, 3);
            ctx.fillRect(this.x + 1, bodyY + 16, 6, 3);
        }
    }
    
    drawPlayerHead(ctx) {
        // Animated head position with bob
        const headY = this.y - 12 + this.bobOffset;
        
        // Head with better shading
        const headGradient = ctx.createRadialGradient(this.x - 2, headY - 2, 0, this.x, headY, 8);
        headGradient.addColorStop(0, '#fff5dc');
        headGradient.addColorStop(1, '#ffdbac');
        ctx.fillStyle = headGradient;
        ctx.fillRect(this.x - 7, headY, 14, 10);
        
        // Head outline
        ctx.strokeStyle = '#cc9966';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - 7, headY, 14, 10);
        
        // Hair with more detail
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x - 7, headY - 2, 14, 4);
        // Hair texture
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#654321';
            ctx.fillRect(this.x - 6 + i * 4, headY - 1, 2, 2);
        }
        
        // Enhanced glasses
        this.drawAnimatedGlasses(ctx, headY);
        
        // Eyes behind glasses with blinking animation
        this.drawAnimatedEyes(ctx, headY);
        
        // Nose
        ctx.fillStyle = '#ffcbac';
        ctx.fillRect(this.x - 1, headY + 3, 2, 1);
        
        // Mouth with subtle animation
        ctx.fillStyle = '#333';
        const mouthOffset = this.isMoving ? Math.sin(this.animationFrame * 0.1) * 0.5 : 0;
        ctx.fillRect(this.x - 1, headY + 5 + mouthOffset, 2, 1);
    }
    
    drawAnimatedGlasses(ctx, headY) {
        // Glasses frame with 3D effect
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // Slight glasses bounce with head movement
        const glassesY = headY + 2;
        
        // Left lens
        ctx.strokeRect(this.x - 6, glassesY, 4, 3);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.fillRect(this.x - 6, glassesY, 4, 3);
        
        // Right lens
        ctx.strokeRect(this.x + 2, glassesY, 4, 3);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.fillRect(this.x + 2, glassesY, 4, 3);
        
        // Bridge
        ctx.beginPath();
        ctx.moveTo(this.x - 2, glassesY + 1.5);
        ctx.lineTo(this.x + 2, glassesY + 1.5);
        ctx.stroke();
        
        // Lens reflections with animation
        const reflectionIntensity = 0.6 + Math.sin(this.animationFrame * 0.05) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${reflectionIntensity})`;
        ctx.fillRect(this.x - 5, glassesY + 1, 1, 1);
        ctx.fillRect(this.x + 3, glassesY + 1, 1, 1);
        
        // Glasses temples
        ctx.beginPath();
        ctx.moveTo(this.x - 6, glassesY + 1.5);
        ctx.lineTo(this.x - 8, glassesY + 1.5);
        ctx.moveTo(this.x + 6, glassesY + 1.5);
        ctx.lineTo(this.x + 8, glassesY + 1.5);
        ctx.stroke();
    }
    
    drawAnimatedEyes(ctx, headY) {
        // Eyes behind glasses with blinking
        const blinkFrame = Math.floor(this.animationFrame / 60) % 120;
        const isBlinking = blinkFrame < 3;
        
        if (!isBlinking) {
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 5, headY + 1, 1, 1); // Left eye
            ctx.fillRect(this.x + 4, headY + 1, 1, 1); // Right eye
        } else {
            // Closed eyes (blinking)
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 5, headY + 1, 1, 0.5);
            ctx.fillRect(this.x + 4, headY + 1, 1, 0.5);
        }
    }
    
    drawPlayerEquipment(ctx) {
        // Weapon (gun pointing toward mouse)
        if (this.mouse) {
            const angle = Math.atan2(this.mouse.y - this.y, this.mouse.x - this.x);
            
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            
            // Gun body
            ctx.fillStyle = '#666';
            ctx.fillRect(8, -2, 12, 4);
            // Gun barrel
            ctx.fillStyle = '#333';
            ctx.fillRect(18, -1, 8, 2);
            // Gun handle
            ctx.fillStyle = '#444';
            ctx.fillRect(6, 0, 4, 6);
            
            ctx.restore();
        }
        
        // Backpack
        ctx.fillStyle = '#2a70c2';
        ctx.fillRect(this.x + 6, this.y - 8, 4, 8);
        ctx.strokeStyle = '#1a50a2';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + 6, this.y - 8, 4, 8);
    }
    
    drawPlayerHealthBar(ctx) {
        const barWidth = 24;
        const barHeight = 4;
        const healthRatio = this.health / this.maxHealth;
        
        // Health bar background with depth
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth/2 + 1, this.y - 22 + 1, barWidth, barHeight);
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x - barWidth/2, this.y - 22, barWidth, barHeight);
        
        // Health bar fill with gradient
        const healthGradient = ctx.createLinearGradient(this.x - barWidth/2, this.y - 22, this.x + barWidth/2, this.y - 22);
        if (healthRatio > 0.6) {
            healthGradient.addColorStop(0, '#00ff00');
            healthGradient.addColorStop(1, '#66ff66');
        } else if (healthRatio > 0.3) {
            healthGradient.addColorStop(0, '#ffff00');
            healthGradient.addColorStop(1, '#ffff66');
        } else {
            healthGradient.addColorStop(0, '#ff0000');
            healthGradient.addColorStop(1, '#ff6666');
        }
        
        ctx.fillStyle = healthGradient;
        ctx.fillRect(this.x - barWidth/2, this.y - 22, barWidth * healthRatio, barHeight);
        
        // Health bar border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - barWidth/2, this.y - 22, barWidth, barHeight);
    }
}

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = 0.8;
        this.health = 300;
        this.maxHealth = 300;
        this.lastShot = 0;
        this.shootCooldown = 1000; // ms
        this.moveDirection = 0;
        this.moveTimer = 0;
        
        // Animation properties
        this.animationFrame = 0;
        this.isMoving = false;
        this.facingDirection = 1;
        this.bobOffset = 0;
        this.armSwing = 0;
        this.breatheOffset = 0;
        this.angerLevel = 0; // Increases as health decreases
        
        // New boss abilities
        this.currentAttack = 'normal';
        this.attackCooldown = 0;
        this.dashCooldown = 0;
        this.burstCooldown = 0;
        this.shieldActive = false;
        this.shieldCooldown = 0;
        this.originalSpeed = this.speed;
        this.phase = 1; // Boss phases based on health
    }
    
    update(player) {
        const oldX = this.x;
        const oldY = this.y;
        
        // Update phase based on health
        this.updatePhase();
        
        // Update cooldowns
        this.attackCooldown = Math.max(0, this.attackCooldown - 1);
        this.dashCooldown = Math.max(0, this.dashCooldown - 1);
        this.burstCooldown = Math.max(0, this.burstCooldown - 1);
        this.shieldCooldown = Math.max(0, this.shieldCooldown - 1);
        
        // Choose attack pattern
        this.chooseAttackPattern(player);
        
        // Execute current movement/attack
        this.executeAttack(player);
        
        // Determine if boss is moving for animations
        this.isMoving = (Math.abs(this.x - oldX) > 0.1 || Math.abs(this.y - oldY) > 0.1);
        
        // Update facing direction based on player position
        if (player.x < this.x) {
            this.facingDirection = -1;
        } else {
            this.facingDirection = 1;
        }
        
        // Keep boss in bounds
        this.x = Math.max(50, Math.min(this.x, 950));
        this.y = Math.max(50, Math.min(this.y, 750));
        
        // Update animations
        this.updateBossAnimations();
    }
    
    updatePhase() {
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent > 0.66) {
            this.phase = 1;
        } else if (healthPercent > 0.33) {
            this.phase = 2;
        } else {
            this.phase = 3;
        }
    }
    
    chooseAttackPattern(player) {
        if (this.attackCooldown > 0) return;
        
        const distanceToPlayer = Math.sqrt(
            Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
        );
        
        // Different attack patterns based on phase and distance
        if (this.phase >= 2 && this.dashCooldown === 0 && distanceToPlayer > 150) {
            this.currentAttack = 'dash';
            this.attackCooldown = 180; // 3 seconds
            this.dashCooldown = 300; // 5 seconds
        } else if (this.phase >= 2 && this.burstCooldown === 0) {
            this.currentAttack = 'burst';
            this.attackCooldown = 120; // 2 seconds
            this.burstCooldown = 240; // 4 seconds
        } else if (this.phase >= 3 && this.shieldCooldown === 0 && !this.shieldActive) {
            this.currentAttack = 'shield';
            this.attackCooldown = 300; // 5 seconds
            this.shieldCooldown = 600; // 10 seconds
        } else {
            this.currentAttack = 'normal';
        }
    }
    
    executeAttack(player) {
        switch (this.currentAttack) {
            case 'dash':
                this.executeDash(player);
                break;
            case 'burst':
                this.executeBurst(player);
                break;
            case 'shield':
                this.executeShield();
                break;
            default:
                this.executeNormalMovement();
                break;
        }
    }
    
    executeDash(player) {
        // Dash towards player
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed * 3;
        this.y += Math.sin(angle) * this.speed * 3;
    }
    
    executeBurst(player) {
        // Stay in place for burst attack
        // Movement handled in normal pattern
        this.executeNormalMovement();
    }
    
    executeShield() {
        this.shieldActive = true;
        // Slower movement when shielded
        this.speed = this.originalSpeed * 0.5;
        this.executeNormalMovement();
        
        // Deactivate shield after some time
        if (this.attackCooldown < 200) {
            this.shieldActive = false;
            this.speed = this.originalSpeed;
        }
    }
    
    executeNormalMovement() {
        // Original movement pattern
        this.moveTimer++;
        if (this.moveTimer > 120) {
            this.moveDirection = Math.random() * Math.PI * 2;
            this.moveTimer = 0;
        }
        
        this.x += Math.cos(this.moveDirection) * this.speed;
        this.y += Math.sin(this.moveDirection) * this.speed;
    }
    
    updateBossAnimations() {
        this.animationFrame += 1;
        
        // Calculate anger level based on health
        this.angerLevel = 1 - (this.health / this.maxHealth);
        
        if (this.isMoving) {
            // Walking animation - slower and more menacing
            this.bobOffset = Math.sin(this.animationFrame * 0.15) * 2;
            this.armSwing = Math.sin(this.animationFrame * 0.2) * 0.5;
        } else {
            // Idle breathing and menacing presence
            this.breatheOffset = Math.sin(this.animationFrame * 0.08) * 1;
            this.armSwing *= 0.95;
        }
    }
    
    canShoot() {
        return Date.now() - this.lastShot > this.shootCooldown;
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    isHit(x, y) {
        return x > this.x - this.width/2 && x < this.x + this.width/2 &&
               y > this.y - this.height/2 && y < this.y + this.height/2;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Draw shadow for depth
        this.drawBossShadow(ctx);
        
        // Draw Pineda (enhanced boss with curly hair and 2.5D effects)
        this.drawBossBody(ctx);
        this.drawBossHead(ctx);
        this.drawBossEquipment(ctx);
        this.drawBossHealthBar(ctx);
        this.drawBossAura(ctx);
        
        // Draw shield if active
        if (this.shieldActive) {
            this.drawShield(ctx);
        }
        
        ctx.restore();
    }
    
    drawBossShadow(ctx) {
        // Boss shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.ellipse(this.x, this.y + 25, 25, 12, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawBossBody(ctx) {
        // Calculate animated positions
        const bodyY = this.y + this.bobOffset + this.breatheOffset;
        const armOffset = this.armSwing;
        
        // Main body with intimidating gradient
        const bodyGradient = ctx.createRadialGradient(this.x - 5, bodyY - 5, 0, this.x, bodyY, 20);
        bodyGradient.addColorStop(0, '#cc0000');
        bodyGradient.addColorStop(0.5, '#8B0000');
        bodyGradient.addColorStop(1, '#440000');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(this.x - 18, bodyY - 12, 36, 36);
        
        // Body armor details
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x - 18, bodyY - 12, 36, 36);
        
        // Armor plates
        ctx.fillStyle = '#aa0000';
        ctx.fillRect(this.x - 15, bodyY - 9, 30, 6);
        ctx.fillRect(this.x - 15, bodyY + 3, 30, 6);
        ctx.fillRect(this.x - 15, bodyY + 15, 30, 6);
        
        // Chest emblem
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x - 3, bodyY - 6, 6, 6);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - 2, bodyY - 5, 4, 4);
        
        // Arms with muscle definition and animation
        this.drawAnimatedBossArms(ctx, bodyY, armOffset);
        
        // Animated legs
        this.drawAnimatedBossLegs(ctx, bodyY);
    }
    
    drawAnimatedBossArms(ctx, bodyY, armOffset) {
        // Left arm with animation
        const leftArmY = bodyY - 8 + armOffset;
        const leftArmGradient = ctx.createLinearGradient(this.x - 25, leftArmY, this.x - 15, leftArmY);
        leftArmGradient.addColorStop(0, '#660000');
        leftArmGradient.addColorStop(1, '#aa0000');
        ctx.fillStyle = leftArmGradient;
        ctx.fillRect(this.x - 25, leftArmY, 8, 16);
        
        // Right arm with animation
        const rightArmY = bodyY - 8 - armOffset;
        const rightArmGradient = ctx.createLinearGradient(this.x + 15, rightArmY, this.x + 25, rightArmY);
        rightArmGradient.addColorStop(0, '#aa0000');
        rightArmGradient.addColorStop(1, '#660000');
        ctx.fillStyle = rightArmGradient;
        ctx.fillRect(this.x + 17, rightArmY, 8, 16);
        
        // Gauntlets with animation
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - 27, leftArmY + 14, 6, 6);
        ctx.fillRect(this.x + 21, rightArmY + 14, 6, 6);
        
        // Spikes on gauntlets
        ctx.fillStyle = '#666';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(this.x - 26 + i * 2, leftArmY + 12, 1, 3);
            ctx.fillRect(this.x + 22 + i * 2, rightArmY + 12, 1, 3);
        }
    }
    
    drawAnimatedBossLegs(ctx, bodyY) {
        if (this.isMoving) {
            // Walking leg animation - heavy stomping
            const legSwing = Math.sin(this.animationFrame * 0.3) * 3;
            const leftLegY = bodyY + 24 + Math.abs(legSwing);
            const rightLegY = bodyY + 24 + Math.abs(-legSwing);
            
            // Left leg
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(this.x - 10, leftLegY, 8, 12);
            
            // Right leg
            ctx.fillRect(this.x + 2, rightLegY, 8, 12);
            
            // Heavy boots
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 12, leftLegY + 10, 12, 6);
            ctx.fillRect(this.x, rightLegY + 10, 12, 6);
            
            // Boot spikes
            ctx.fillStyle = '#666';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(this.x - 11 + i * 3, leftLegY + 8, 1, 3);
                ctx.fillRect(this.x + 1 + i * 3, rightLegY + 8, 1, 3);
            }
        } else {
            // Standing legs with breathing animation
            const breatheLegOffset = this.breatheOffset * 0.5;
            
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(this.x - 10, bodyY + 24 + breatheLegOffset, 8, 12);
            ctx.fillRect(this.x + 2, bodyY + 24 + breatheLegOffset, 8, 12);
            
            // Heavy boots
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 12, bodyY + 34 + breatheLegOffset, 12, 6);
            ctx.fillRect(this.x, bodyY + 34 + breatheLegOffset, 12, 6);
            
            // Boot spikes
            ctx.fillStyle = '#666';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(this.x - 11 + i * 3, bodyY + 32 + breatheLegOffset, 1, 3);
                ctx.fillRect(this.x + 1 + i * 3, bodyY + 32 + breatheLegOffset, 1, 3);
            }
        }
    }
    
    drawBossHead(ctx) {
        // Animated head position with bob and breathing
        const headY = this.y - 16 + this.bobOffset + this.breatheOffset;
        
        // Head with menacing gradient
        const headGradient = ctx.createRadialGradient(this.x - 3, headY - 2, 0, this.x, headY, 15);
        headGradient.addColorStop(0, '#fff5dc');
        headGradient.addColorStop(1, '#ffdbac');
        ctx.fillStyle = headGradient;
        ctx.fillRect(this.x - 15, headY - 8, 30, 20);
        
        // Head outline
        ctx.strokeStyle = '#cc9966';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 15, headY - 8, 30, 20);
        
        // Enhanced curly hair with animation
        this.drawAnimatedCurlyHair(ctx, headY);
        
        // Animated menacing face
        this.drawAnimatedBossFace(ctx, headY);
        
        // Scars and battle marks
        this.drawBattleMarks(ctx, headY);
    }
    
    drawAnimatedCurlyHair(ctx, headY) {
        ctx.fillStyle = '#654321';
        
        // Base hair mass with minimal animation
        const hairOffset = Math.sin(this.animationFrame * 0.02) * 0.2;
        ctx.fillRect(this.x - 16, headY - 12 + hairOffset, 32, 8);
        
        // Large curls around the head with subtle movement
        const curls = [
            {x: this.x - 12, y: headY - 10, size: 4},
            {x: this.x - 8, y: headY - 14, size: 5},
            {x: this.x - 4, y: headY - 16, size: 4},
            {x: this.x, y: headY - 17, size: 6},
            {x: this.x + 4, y: headY - 16, size: 4},
            {x: this.x + 8, y: headY - 14, size: 5},
            {x: this.x + 12, y: headY - 10, size: 4},
            {x: this.x - 14, y: headY - 6, size: 3},
            {x: this.x + 14, y: headY - 6, size: 3},
            {x: this.x - 16, y: headY - 2, size: 3},
            {x: this.x + 16, y: headY - 2, size: 3}
        ];
        
        curls.forEach((curl, index) => {
            const curlOffset = Math.sin(this.animationFrame * 0.01 + index) * 0.1;
            ctx.beginPath();
            ctx.arc(curl.x + curlOffset, curl.y, curl.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add spiral effect to curls
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(curl.x + curlOffset, curl.y, curl.size - 1, 0, Math.PI * 1.5);
            ctx.stroke();
        });
        
        // Additional small curly details with minimal animation
        ctx.fillStyle = '#8B4513';
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 + this.animationFrame * 0.005;
            const x = this.x + Math.cos(angle) * 18;
            const y = headY - 9 + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawAnimatedBossFace(ctx, headY) {
        // Angry eyebrows with animation based on anger level
        ctx.fillStyle = '#654321';
        const eyebrowAnger = this.angerLevel * 2;
        ctx.fillRect(this.x - 12, headY - 4 - eyebrowAnger, 8, 2);
        ctx.fillRect(this.x + 4, headY - 4 - eyebrowAnger, 8, 2);
        
        // Glowing red eyes with intensity based on health
        const eyeGlow = 0.5 + this.angerLevel * 0.5;
        const eyeFlicker = Math.sin(this.animationFrame * 0.3) * 0.1;
        
        ctx.fillStyle = `rgba(255, ${Math.floor((1 - eyeGlow) * 255)}, 0, ${eyeGlow + eyeFlicker})`;
        ctx.fillRect(this.x - 10, headY - 2, 4, 3);
        ctx.fillRect(this.x + 6, headY - 2, 4, 3);
        
        // Eye glow effect with animation
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 5 + this.angerLevel * 5;
        ctx.fillStyle = '#ffaaaa';
        ctx.fillRect(this.x - 9, headY - 1, 2, 1);
        ctx.fillRect(this.x + 7, headY - 1, 2, 1);
        ctx.shadowBlur = 0;
        
        // Nose
        ctx.fillStyle = '#ffcbac';
        ctx.fillRect(this.x - 2, headY + 2, 4, 3);
        
        // Menacing grin with animation
        const mouthAnimation = Math.sin(this.animationFrame * 0.2) * 0.5;
        ctx.fillStyle = '#330000';
        ctx.fillRect(this.x - 6, headY + 6 + mouthAnimation, 12, 3);
        
        // Teeth with slight animation
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 6; i++) {
            const toothOffset = Math.sin(this.animationFrame * 0.1 + i) * 0.2;
            ctx.fillRect(this.x - 5 + i * 2, headY + 7 + mouthAnimation + toothOffset, 1, 2);
        }
        
        // Facial hair/goatee with slight movement
        ctx.fillStyle = '#654321';
        const goateeOffset = Math.sin(this.animationFrame * 0.15) * 0.3;
        ctx.fillRect(this.x - 3, headY + 10 + goateeOffset, 6, 4);
    }
    
    drawBattleMarks(ctx, headY) {
        // Scars with animation
        ctx.strokeStyle = '#cc9966';
        ctx.lineWidth = 1;
        const scarOffset = Math.sin(this.animationFrame * 0.1) * 0.2;
        ctx.beginPath();
        ctx.moveTo(this.x - 8, headY + scarOffset);
        ctx.lineTo(this.x - 6, headY + 2 + scarOffset);
        ctx.moveTo(this.x + 8, headY + 4 + scarOffset);
        ctx.lineTo(this.x + 10, headY + 6 + scarOffset);
        ctx.stroke();
    }
    
    drawBossEquipment(ctx) {
        // Shoulder spikes
        ctx.fillStyle = '#666';
        const spikes = [
            {x: this.x - 20, y: this.y - 15},
            {x: this.x + 20, y: this.y - 15}
        ];
        
        spikes.forEach(spike => {
            ctx.beginPath();
            ctx.moveTo(spike.x, spike.y);
            ctx.lineTo(spike.x - 3, spike.y - 8);
            ctx.lineTo(spike.x + 3, spike.y - 8);
            ctx.closePath();
            ctx.fill();
        });
        
        // Belt
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - 18, this.y + 8, 36, 4);
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x - 2, this.y + 8, 4, 4);
    }
    
    drawBossHealthBar(ctx) {
        const barWidth = 50;
        const barHeight = 6;
        const healthRatio = this.health / this.maxHealth;
        
        // Health bar background with depth
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth/2 + 2, this.y - 42 + 2, barWidth, barHeight);
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x - barWidth/2, this.y - 42, barWidth, barHeight);
        
        // Health bar fill with boss-style gradient
        const healthGradient = ctx.createLinearGradient(this.x - barWidth/2, this.y - 42, this.x + barWidth/2, this.y - 42);
        healthGradient.addColorStop(0, '#ff0000');
        healthGradient.addColorStop(0.5, '#ff4444');
        healthGradient.addColorStop(1, '#ff6666');
        
        ctx.fillStyle = healthGradient;
        ctx.fillRect(this.x - barWidth/2, this.y - 42, barWidth * healthRatio, barHeight);
        
        // Health bar border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - barWidth/2, this.y - 42, barWidth, barHeight);
        
        // Boss name with enhanced styling
        ctx.font = 'bold 14px Courier New';
        ctx.fillStyle = '#ff6666';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.strokeText('BOSS PINEDA', this.x, this.y - 50);
        ctx.fillText('BOSS PINEDA', this.x, this.y - 50);
    }
    
    drawBossAura(ctx) {
        // Menacing aura effect - more subtle
        ctx.save();
        const time = Date.now() * 0.001;
        const auraRadius = 35 + Math.sin(time) * 2;
        
        const auraGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, auraRadius);
        auraGradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        auraGradient.addColorStop(0.8, `rgba(255, 0, 0, ${0.05 + this.angerLevel * 0.05})`);
        auraGradient.addColorStop(1, `rgba(255, 0, 0, ${0.1 + this.angerLevel * 0.1})`);
        
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, auraRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawShield(ctx) {
        // Draw energy shield around boss
        ctx.save();
        const shieldRadius = 50;
        const time = Date.now() * 0.01;
        
        // Shield energy effect
        const shieldGradient = ctx.createRadialGradient(this.x, this.y, shieldRadius - 10, this.x, this.y, shieldRadius);
        shieldGradient.addColorStop(0, 'rgba(0, 150, 255, 0)');
        shieldGradient.addColorStop(0.8, 'rgba(0, 150, 255, 0.3)');
        shieldGradient.addColorStop(1, 'rgba(0, 150, 255, 0.6)');
        
        ctx.fillStyle = shieldGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, shieldRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Shield hexagon pattern
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 0.1;
            const x1 = this.x + Math.cos(angle) * (shieldRadius - 5);
            const y1 = this.y + Math.sin(angle) * (shieldRadius - 5);
            const x2 = this.x + Math.cos(angle + Math.PI / 3) * (shieldRadius - 5);
            const y2 = this.y + Math.sin(angle + Math.PI / 3) * (shieldRadius - 5);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    canShoot() {
        const cooldownMultiplier = this.phase >= 2 ? 0.7 : 1;
        return Date.now() - this.lastShot > this.shootCooldown * cooldownMultiplier;
    }
    
    executeShootingPattern(game) {
        switch (this.currentAttack) {
            case 'burst':
                this.shootBurst(game);
                break;
            case 'dash':
                this.shootNormal(game);
                break;
            default:
                this.shootNormal(game);
                break;
        }
    }
    
    shootNormal(game) {
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        game.enemyBullets.push(new Bullet(this.x, this.y, angle, 'enemy'));
    }
    
    shootBurst(game) {
        const baseAngle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        const spreadAngles = [-0.5, -0.25, 0, 0.25, 0.5];
        
        if (this.phase >= 3) {
            spreadAngles.push(-0.75, 0.75);
        }
        
        spreadAngles.forEach(offset => {
            const angle = baseAngle + offset;
            game.enemyBullets.push(new Bullet(this.x, this.y, angle, 'enemy'));
        });
    }
    
    takeDamage(damage) {
        if (this.shieldActive) {
            damage = Math.floor(damage * 0.5);
        }
        this.health -= damage;
    }
}

class Bullet {
    constructor(x, y, angle, type) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = type === 'player' ? 8 : 4;
        this.type = type;
        this.lifetime = 0;
        this.maxLifetime = 120; // 2 seconds at 60fps
        this.size = type === 'player' ? 3 : 4;
    }
    
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.lifetime++;
    }
    
    shouldRemove() {
        return this.lifetime > this.maxLifetime ||
               this.x < 0 || this.x > 1000 || this.y < 0 || this.y > 800;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Enhanced bullet with 3D effect and trail
        if (this.type === 'player') {
            // Player bullet - cyan energy projectile
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 8;
            
            // Outer glow
            const outerGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size + 2);
            outerGradient.addColorStop(0, '#00ffff');
            outerGradient.addColorStop(0.5, '#0088ff');
            outerGradient.addColorStop(1, 'rgba(0, 136, 255, 0)');
            ctx.fillStyle = outerGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size - 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Energy core
            ctx.fillStyle = '#aaffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
        } else {
            // Enemy bullet - red fiery projectile
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;
            
            // Outer flame
            const flameGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size + 3);
            flameGradient.addColorStop(0, '#ffff00');
            flameGradient.addColorStop(0.3, '#ff4444');
            flameGradient.addColorStop(0.7, '#aa0000');
            flameGradient.addColorStop(1, 'rgba(170, 0, 0, 0)');
            ctx.fillStyle = flameGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner fire
            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Hot core
            ctx.fillStyle = '#ffaaaa';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size - 1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.lifetime = 0;
        this.maxLifetime = type === 'victory' ? 180 : 45;
        this.size = Math.random() * 3 + 1;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        
        switch(type) {
            case 'hit':
                this.color = '#ffff00';
                this.secondaryColor = '#ffa500';
                break;
            case 'playerHit':
                this.color = '#ff0000';
                this.secondaryColor = '#ff6666';
                break;
            case 'victory':
                this.color = '#00ff00';
                this.secondaryColor = '#66ff66';
                break;
            default:
                this.color = '#ffffff';
                this.secondaryColor = '#cccccc';
        }
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.rotation += this.rotationSpeed;
        this.lifetime++;
        
        // Add gravity for some particle types
        if (this.type === 'victory') {
            this.vy += 0.1;
        }
    }
    
    shouldRemove() {
        return this.lifetime > this.maxLifetime;
    }
    
    draw(ctx) {
        ctx.save();
        
        const alpha = 1 - (this.lifetime / this.maxLifetime);
        const currentSize = this.size * (1 - this.lifetime / this.maxLifetime * 0.5);
        
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (this.type === 'victory') {
            // Star-shaped victory particles
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
            
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const x = Math.cos(angle) * currentSize;
                const y = Math.sin(angle) * currentSize;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            
        } else if (this.type === 'hit') {
            // Spark-like hit particles
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 5;
            
            ctx.beginPath();
            ctx.moveTo(-currentSize, 0);
            ctx.lineTo(currentSize, 0);
            ctx.moveTo(0, -currentSize);
            ctx.lineTo(0, currentSize);
            ctx.stroke();
            
            // Add glow effect
            ctx.fillStyle = this.secondaryColor;
            ctx.beginPath();
            ctx.arc(0, 0, currentSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
        } else {
            // Standard circular particles with gradient
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(0.7, this.secondaryColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
