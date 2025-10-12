// One Last Game - Soul Knight Style
// Main character: Hebrado (nerdy dude with glasses)
// Boss: Pineda (curly hair)

class Game {
    constructor() {
        console.log('Game constructor called');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size maintaining 4:3 aspect ratio
        const aspectRatio = 4 / 3;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const viewportAspectRatio = viewportWidth / viewportHeight;
        
        if (viewportAspectRatio > aspectRatio) {
            // Viewport is wider than 4:3, fit by height
            this.height = viewportHeight;
            this.width = viewportHeight * aspectRatio;
        } else {
            // Viewport is taller than 4:3, fit by width
            this.width = viewportWidth;
            this.height = viewportWidth / aspectRatio;
        }
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.worldWidth = 2000;   // bigger map area
        this.worldHeight = 1600;  // bigger dungeon

        // Orientation detection for mobile
        this.isPortrait = false;
        this.checkOrientation();
        
        // Listen for orientation changes
        window.addEventListener('resize', () => this.checkOrientation());
        window.addEventListener('orientationchange', () => this.checkOrientation());
        
        // Update UI visibility initially
        this.updateUIVisibility();
        
        // Game state
        this.gameState = 'title'; // title, playing, bossDefeated, gameOver
        this.camera = { x: 0, y: 0 };
        
        // Screen shake effect
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;
        
        // Death effect timer
        this.deathTimer = 0;
        
        // Initialize game objects
        this.player = new Player(100, 100);
        this.boss = new Boss(600, 300, this);

        // Pickup items
        this.pickups = [];
        
        // Spawn initial pickups
        this.spawnPickups();

        if (this.isMobile) {
  this.player.scale = 10; // 60% larger
  this.boss.scale = 10;   // same scaling for boss
} else {
  this.player.scale = 2.0;
  this.boss.scale = 20;
}
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];

        // --- Scale up player and boss on mobile for better visibility ---


        
        // Input handling
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        // Mobile touch controls
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       ('ontouchstart' in window) || 
                       (navigator.maxTouchPoints > 0);
        
        // Force mobile controls for testing
        this.isMobile = true;
        
        // Auto-aim state
        this.isAutoAiming = false;
        this.touchControls = {
            moveJoystick: { active: false, x: 0, y: 0, centerX: 0, centerY: 0 },
            shootArea: { active: false }
        };
        
        // Setup mobile controls after a delay to ensure DOM is ready
        setTimeout(() => {
            this.handleResize();
            const mobileControls = document.getElementById('mobileControls');
            if (mobileControls) {
                mobileControls.style.display = 'flex';
            }
            // Prevent context menu on mobile
            document.addEventListener('contextmenu', (e) => e.preventDefault());
            
            if (this.isMobile) {
                this.setupMobileControls();
            }
        }, 100);

        
        this.gameLoop();
    }
    
    checkOrientation() {
        // Check if device is in portrait mode
        const wasPortrait = this.isPortrait;
        this.isPortrait = window.innerHeight > window.innerWidth;
        
        // Update UI visibility when orientation changes
        if (wasPortrait !== this.isPortrait) {
            this.updateUIVisibility();
        }
    }
    
    updateUIVisibility() {
        // Get UI elements
        const healthDiv = document.getElementById('health');
        const bossHealthDiv = document.getElementById('bossHealth');
        const weaponDiv = document.getElementById('weapon');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const moveControls = document.getElementById('moveControls');
        const shootControls = document.getElementById('shootControls');
        
        if (this.isPortrait) {
            // Hide UI elements in portrait mode
            if (healthDiv) healthDiv.style.display = 'none';
            if (bossHealthDiv) bossHealthDiv.style.display = 'none';
            if (weaponDiv) weaponDiv.style.display = 'none';
            if (fullscreenBtn) fullscreenBtn.style.display = 'none';
            if (moveControls) moveControls.style.display = 'none';
            if (shootControls) shootControls.style.display = 'none';
        } else {
            // Show UI elements in landscape mode
            if (healthDiv) healthDiv.style.display = 'block';
            if (bossHealthDiv) bossHealthDiv.style.display = 'block';
            if (weaponDiv) weaponDiv.style.display = 'block';
            if (fullscreenBtn) fullscreenBtn.style.display = 'block';
            if (moveControls) moveControls.style.display = 'flex';
            if (shootControls) shootControls.style.display = 'flex';
        }
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
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
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
        const moveControls = document.getElementById('moveControls');
        const shootControls = document.getElementById('shootControls');
        const moveJoystick = document.getElementById('moveJoystick');

        // Move joystick controls
        moveControls.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = moveControls.getBoundingClientRect();
            this.touchControls.moveJoystick.centerX = rect.left + rect.width / 2;
            this.touchControls.moveJoystick.centerY = rect.top + rect.height / 2;
            this.touchControls.moveJoystick.active = true;
            this.updateJoystick(touch);
        });

        moveControls.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.touchControls.moveJoystick.active) {
                const touch = e.touches[0];
                this.updateJoystick(touch);
            }
        });

        moveControls.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchControls.moveJoystick.active = false;
            this.touchControls.moveJoystick.x = 0;
            this.touchControls.moveJoystick.y = 0;
            moveJoystick.style.transform = 'translate(-50%, -50%)';
            // Reset movement keys
            this.keys['w'] = this.keys['a'] = this.keys['s'] = this.keys['d'] = false;
        });

        // Shoot button controls (simplified to just tap to shoot with auto-aim)
        shootControls.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('Touch start on shoot button');
            this.startAutoAim();
        });

        shootControls.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Touch end on shoot button');
            this.stopAutoAim();
        });

        // Also add mouse events for desktop testing
        shootControls.addEventListener('mousedown', (e) => {
            this.startAutoAim();
        });

        shootControls.addEventListener('mouseup', (e) => {
            this.stopAutoAim();
        });
        
        console.log('Event listeners attached to shootControls');

        // Prevent scrolling on touch controls
        document.getElementById('mobileControls').addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Setup fullscreen functionality
        this.setupFullscreen();
    }

    setupFullscreen() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
        
        // Listen for fullscreen changes to update button text
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton();
        });
        document.addEventListener('webkitfullscreenchange', () => {
            this.updateFullscreenButton();
        });
        document.addEventListener('mozfullscreenchange', () => {
            this.updateFullscreenButton();
        });
        document.addEventListener('MSFullscreenChange', () => {
            this.updateFullscreenButton();
        });
        
        // Set initial button state
        this.updateFullscreenButton();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && !document.msFullscreenElement) {
            // Enter fullscreen
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    updateFullscreenButton() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || 
                               document.mozFullScreenElement || document.msFullscreenElement;
            fullscreenBtn.textContent = isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
        }
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

    startAutoAim() {
        this.isAutoAiming = true;
        this.mouse.down = true;
    }

    stopAutoAim() {
        this.isAutoAiming = false;
        this.mouse.down = false;
        this.player.shootingAngle = 0; // Reset arm to default position
    }

    updateAutoAim() {
        if (this.isAutoAiming && this.gameState === 'playing') {
            // Calculate direction to boss
            const dx = this.boss.x - this.player.x;
            const dy = this.boss.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                // Set mouse position to aim at boss center
                this.mouse.x = this.boss.x;
                this.mouse.y = this.boss.y;
                
                // Update player's shooting angle for arm aiming
                this.player.shootingAngle = Math.atan2(dy, dx);
            }
        }
    }


    handleResize() {
        // Adjust canvas size for mobile
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    
    update() {
        if (this.gameState === 'title') {
            // Check for start input
            if (this.keys[' '] || this.keys['enter'] || this.mouse.down) {
                this.startGame();
            }
            return;
        }
        
        if (this.gameState !== 'playing') return;
        
        // Update player
        this.player.update(this.keys, this.mouse, this.boss);
        
        // Update boss
        this.boss.update(this.player);
        
        // Update auto-aim if active
        this.updateAutoAim();
        
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
        
        // Update screen shake
        this.updateShake();
        
        // Update pickups
        this.pickups.forEach(pickup => pickup.update());
        
        // Check pickup collisions
        this.checkPickupCollisions();
        
        // Player shooting
     // Player shooting
     // Player shooting
if (this.mouse.down && this.player.canShoot()) {
    let angle;
    if (this.isAutoAiming) {
        // Auto-aim at boss
        const dx = this.boss.x - this.player.x;
        const dy = this.boss.y - this.player.y;
        angle = Math.atan2(dy, dx);
    } else {
        // Manual aim using mouse position (convert screen space to world space)
        const worldMouseX = this.mouse.x + this.camera.x;
        const worldMouseY = this.mouse.y + this.camera.y;
        angle = Math.atan2(worldMouseY - this.player.y, worldMouseX - this.player.x);
    }
    
    // Calculate bullet spawn position from gun barrel (not player center)
    const handOffset = 3; // Same as gun position
    const gunOffsetX = Math.cos(angle) * (handOffset - this.player.recoilOffset);
    const gunOffsetY = Math.sin(angle) * (handOffset - this.player.recoilOffset);
    const barrelLength = this.player.currentWeapon === 'onion' ? 29 : 25; // Match new gun barrel lengths
    const barrelOffsetX = Math.cos(angle) * barrelLength;
    const barrelOffsetY = Math.sin(angle) * barrelLength;
    
    this.bullets.push(new Bullet(
        this.player.x + gunOffsetX + barrelOffsetX, 
        this.player.y + gunOffsetY + barrelOffsetY, 
        angle, 
        this.player.currentWeapon === 'onion' ? 'onion' : 'player'
    ));
    
    // Add recoil to player
    this.player.recoilOffset = this.player.maxRecoil;
    
    this.player.lastShot = Date.now();
}


        
        // Boss shooting with new attack patterns
        if (this.boss.canShoot()) {
            this.boss.executeShootingPattern(this);
            this.boss.lastShot = Date.now();
        }
        
        // Collision detection
        this.checkCollisions();
        
        // Handle death timers
        if (this.deathTimer > 0) {
            this.deathTimer--;
            if (this.deathTimer === 0) {
                if (this.boss.health <= 0) {
                    this.gameState = 'bossDefeated';
                }
            }
        }
        
        // Update camera
        this.updateCamera();
        
        // Update UI
        this.updateUI();
    }
    
    checkCollisions() {
        // Player bullets vs Boss
        this.bullets.forEach((bullet, bulletIndex) => {
            if (this.boss.isHit(bullet.x, bullet.y)) {
                this.boss.takeDamage(bullet.damage);
                this.bullets.splice(bulletIndex, 1);
                
                // Add hit particles
                const particleCount = this.isMobile ? 2 : 5;
                for (let i = 0; i < particleCount; i++) {
                    this.particles.push(new Particle(bullet.x, bullet.y, 'hit'));
                }
                
                if (this.boss.health <= 0) {
                    // Trigger screen shake and explosion effects
                    this.triggerShake(15);
                    const explosionCount = this.isMobile ? 15 : 30;
                    for (let i = 0; i < explosionCount; i++) {
                        this.particles.push(new Particle(this.boss.x, this.boss.y, 'explosion'));
                    }
                    // Start death timer
                    this.deathTimer = 120; // 2 seconds at 60fps
                }
            }
        });
        
        // Enemy bullets vs Player
        this.enemyBullets.forEach((bullet, bulletIndex) => {
            if (this.player.isHit(bullet.x, bullet.y)) {
                this.player.takeDamage(7);
                this.enemyBullets.splice(bulletIndex, 1);
                
                // Add hit particles
                const hitCount = this.isMobile ? 1 : 3;
                for (let i = 0; i < hitCount; i++) {
                    this.particles.push(new Particle(bullet.x, bullet.y, 'playerHit'));
                }
                
                if (this.player.health <= 0) {
                    this.gameState = 'gameOver';
                    // Add defeat particles
                    const defeatCount = this.isMobile ? 8 : 15;
                    for (let i = 0; i < defeatCount; i++) {
                        this.particles.push(new Particle(this.player.x, this.player.y, 'defeat'));
                    }
                }
            }
        });
    }
    
updateCamera() {
    // Desired camera center follows player
    let targetX = this.player.x - this.width / 2;
    let targetY = this.player.y - this.height / 2;

    // Smooth follow (lerp)
    this.camera.x += (targetX - this.camera.x) * 0.12;
    this.camera.y += (targetY - this.camera.y) * 0.12;

    // Map size (match your actual level)
    const mapWidth = this.worldWidth;
    const mapHeight = this.worldHeight;

    // Zoom level
    const zoom = this.isMobile ? 1.3 : 1.0;
    const visibleWidth = this.width / zoom;
    const visibleHeight = this.height / zoom;

    // Half dimensions for centering
    const halfVisibleW = visibleWidth / 2;
    const halfVisibleH = visibleHeight / 2;

    // Clamp camera center — this keeps you fully visible at all edges
    let camCenterX = Math.max(halfVisibleW, Math.min(this.player.x, mapWidth - halfVisibleW));
    let camCenterY = Math.max(halfVisibleH, Math.min(this.player.y, mapHeight - halfVisibleH));

    // Convert center to top-left camera position
    this.camera.x = camCenterX - halfVisibleW;
    this.camera.y = camCenterY - halfVisibleH;

    // Special clamping for infinite floor effect on upper and left sides
    // Allow slight negative camera positions for infinite floor effect
    this.camera.x = Math.max(-60, this.camera.x); // Allow camera to go slightly negative left
    this.camera.y = Math.max(-60, this.camera.y); // Allow camera to go slightly negative up

    // For right and bottom, allow some over-pan to show the dungeon walls
    this.camera.x = Math.min(this.camera.x, mapWidth - visibleWidth + 20); // Slight over-pan right
    this.camera.y = Math.min(this.camera.y, mapHeight - visibleHeight + 20); // Slight over-pan bottom

        // Prevent subpixel rendering issues
        this.camera.x = Math.floor(this.camera.x);
        this.camera.y = Math.floor(this.camera.y);
    }
    
    // Screen shake methods
    triggerShake(intensity = 10) {
        this.shakeIntensity = intensity;
    }
    
    updateShake() {
        this.shakeIntensity *= this.shakeDecay;
        if (this.shakeIntensity < 0.1) {
            this.shakeIntensity = 0;
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        // Reset mouse down state to prevent accidental shooting
        this.mouse.down = false;
    }
    
    spawnPickups() {
        // Arena bounds (playable area within walls)
        const arenaLeft = 40;
        const arenaRight = 960;
        const arenaTop = 40;
        const arenaBottom = 760;
        const margin = 50; // Keep pickups away from walls
        
        // Spawn health pickups inside arena
        for (let i = 0; i < 5; i++) {
            const x = arenaLeft + margin + Math.random() * (arenaRight - arenaLeft - margin * 2);
            const y = arenaTop + margin + Math.random() * (arenaBottom - arenaTop - margin * 2);
            this.pickups.push(new HealthPickup(x, y));
        }
        
        // Spawn shield pickups inside arena
        for (let i = 0; i < 3; i++) {
            const x = arenaLeft + margin + Math.random() * (arenaRight - arenaLeft - margin * 2);
            const y = arenaTop + margin + Math.random() * (arenaBottom - arenaTop - margin * 2);
            this.pickups.push(new ShieldPickup(x, y));
        }
        
        // Spawn onion pickups inside arena (rare weapon upgrades)
        for (let i = 0; i < 1; i++) {
            const x = arenaLeft + margin + Math.random() * (arenaRight - arenaLeft - margin * 2);
            const y = arenaTop + margin + Math.random() * (arenaBottom - arenaTop - margin * 2);
            this.pickups.push(new OnionPickup(x, y));
        }
    }
    
    checkPickupCollisions() {
        this.pickups.forEach((pickup, index) => {
            const dx = pickup.x - this.player.x;
            const dy = pickup.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 25) { // Pickup radius
                pickup.applyEffect(this.player);
                this.pickups.splice(index, 1);
                
                // Add pickup effect particles
                for (let i = 0; i < 8; i++) {
                    this.particles.push(new Particle(pickup.x, pickup.y, 'victory'));
                }
            }
        });
    }
    
    drawTitleScreen() {
        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Draw dark background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw pixel art title "HEBRADO KNIGHT"
        this.drawPixelTitle(ctx, centerX, centerY - 80);
        
        // Draw subtitle
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#00ff99';
        ctx.textAlign = 'center';
        ctx.fillText('Gay Best Friend', centerX, centerY + 20);
        
        // Draw instructions
        ctx.font = '14px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Press Shoot to Start', centerX, centerY + 60);
        
        // Draw controls hint
        ctx.font = '12px monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText('Click/Hold to Shoot', centerX, centerY + 90);
        
        // Add some decorative elements
        this.drawTitleDecorations(ctx, centerX, centerY);
    }
    
    drawPixelTitle(ctx, x, y) {
        const pixelSize = 4;
        const letters = {
            'H': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'E': [
                [1,1,1,1,1],
                [1,0,0,0,0],
                [1,1,1,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1]
            ],
            'B': [
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,1,1,1,0]
            ],
            'R': [
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,1,1,1,0],
                [1,0,1,0,0],
                [1,0,0,1,0]
            ],
            'A': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,1,1,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'D': [
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,0]
            ],
            'O': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'K': [
                [1,0,0,0,1],
                [1,0,0,1,0],
                [1,1,1,0,0],
                [1,0,0,1,0],
                [1,0,0,0,1]
            ],
            'N': [
                [1,0,0,0,1],
                [1,1,0,0,1],
                [1,0,1,0,1],
                [1,0,0,1,1],
                [1,0,0,0,1]
            ],
            'I': [
                [1,1,1,1,1],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [1,1,1,1,1]
            ],
            'G': [
                [0,1,1,1,0],
                [1,0,0,0,0],
                [1,0,1,1,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'T': [
                [1,1,1,1,1],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0]
            ]
        };
        
        const titleText = "HEBRADO KNIGHT";
        let currentX = x - (titleText.length * pixelSize * 6) / 2; // Center the title
        
        for (let char of titleText) {
            if (char === ' ') {
                currentX += pixelSize * 6; // Space
                continue;
            }
            
            const letter = letters[char];
            if (letter) {
                for (let row = 0; row < letter.length; row++) {
                    for (let col = 0; col < letter[row].length; col++) {
                        if (letter[row][col]) {
                            // Draw pixel with glow effect
                            ctx.fillStyle = '#00ff99';
                            ctx.fillRect(currentX + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
                            
                            // Add glow
                            ctx.shadowColor = '#00ff99';
                            ctx.shadowBlur = 3;
                            ctx.fillRect(currentX + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
                            ctx.shadowBlur = 0;
                        }
                    }
                }
            }
            currentX += pixelSize * 6; // Space between letters
        }
    }
    
    drawTitleDecorations(ctx, centerX, centerY) {
        const time = Date.now() * 0.001;
        
        // Draw some floating particles
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2 + time * 0.5;
            const distance = 100 + Math.sin(time * 2 + i) * 20;
            const particleX = centerX + Math.cos(angle) * distance;
            const particleY = centerY + Math.sin(angle) * distance;
            
            ctx.fillStyle = `rgba(0, 255, 153, ${0.3 + Math.sin(time * 3 + i) * 0.2})`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw corner decorations
        ctx.strokeStyle = '#00ff99';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, this.width - 40, this.height - 40);
        
        // Draw pulsing border
        const pulse = Math.sin(time * 2) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(0, 255, 153, ${pulse * 0.3})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, this.width - 20, this.height - 20);
    }


    
    updateUI() {
        document.getElementById('health').textContent = `Health: ${Math.max(0, this.player.health)}`;
        document.getElementById('weapon').textContent = `Weapon: ${this.player.currentWeapon === 'normal' ? 'Normal Gun' : 'Onion Gun'}`;
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
        
        // Check for portrait mode on mobile
        if (this.isMobile && this.isPortrait) {
            this.drawRotateMessage();
            return;
        }
        
        if (this.gameState === 'title') {
            this.drawTitleScreen();
            return;
        }
        
        // Save context for camera transform
        this.ctx.save();

// --- Adjust camera for zoom ---
const zoom = this.isMobile ? 1.2 : 1.0; // Reduced zoom for full-screen mobile
this.ctx.scale(zoom, zoom);

// offset so zoom centers on player without cropping
const offsetX = (this.width / 2) / zoom - this.width / 2;
const offsetY = (this.height / 2) / zoom - this.height / 2;

// Add screen shake offset
const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
const shakeY = (Math.random() - 0.5) * this.shakeIntensity;

this.ctx.translate(-this.camera.x + offsetX + shakeX, -this.camera.y + offsetY + shakeY);

        
        // Draw dungeon background
        this.drawDungeon();
        
        // Draw game objects
        this.player.draw(this.ctx, this.camera);
        this.boss.draw(this.ctx);
        
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.enemyBullets.forEach(bullet => bullet.draw(this.ctx));
        this.particles.forEach(particle => particle.draw(this.ctx));
        
        // Draw pickups
        this.pickups.forEach(pickup => pickup.draw(this.ctx));
        
        // Restore context
        this.ctx.restore();
        
        // Draw game state messages
        this.drawGameStateMessages();
    }
    
    drawRotateMessage() {
        // Clear entire canvas and fill with dark background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Calculate responsive text size based on canvas dimensions
        const canvasAspectRatio = this.width / this.height;
        const baseSize = Math.min(this.width, this.height);
        
        // Adjust text size based on canvas aspect ratio to prevent stretching
        let textSize;
        if (canvasAspectRatio > 1.5) { // Very wide canvas
            textSize = Math.min(baseSize * 0.06, 28);
        } else if (canvasAspectRatio < 0.8) { // Very tall canvas
            textSize = Math.min(baseSize * 0.08, 32);
        } else { // Normal aspect ratios
            textSize = Math.min(baseSize * 0.07, 30);
        }
        
        const subTextSize = textSize * 0.6;
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Set text rendering properties to prevent stretching
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.imageSmoothingEnabled = true;
        
        // Main instruction text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${textSize}px Arial, sans-serif`;
        this.ctx.fillText('Please rotate your phone', centerX, centerY - textSize * 0.8);
        
        // Subtitle
        this.ctx.font = `${subTextSize}px Arial, sans-serif`;
        this.ctx.fillText('and refresh after rotating to fix the stretched screen', centerX, centerY + textSize * 0.8);
        
        this.ctx.restore();
    }
    
 // --- DUNGEON MAP REPLACEMENT ---
drawDungeon() {
    this.drawDungeonBase();
    this.drawDungeonWalls();
    this.drawDungeonTorches();
    this.drawDungeonLighting();
}

drawDungeonBase() {
    const ctx = this.ctx;
    const tileSize = 50;

    // Base stone color (dark gray)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
for (let x = 0; x < this.worldWidth; x += tileSize) {
    for (let y = 0; y < this.worldHeight; y += tileSize) {
        // draw tiles...
    }
}



    for (let x = 0; x < this.worldWidth; x += tileSize) {
        for (let y = 0; y < this.worldHeight; y += tileSize) {
            // Rough stone texture
            const gradient = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(0.5, '#111');
            gradient.addColorStop(1, '#050505');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, tileSize, tileSize);

            // Stone cracks
            ctx.strokeStyle = 'rgba(60,60,60,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, tileSize, tileSize);
        }
    }
}

drawDungeonWalls() {
    const ctx = this.ctx;

    // Draw different wall styles for each side to create infinite dungeon effect
    this.drawInfiniteLeftWall(ctx);
    this.drawInfiniteTopWall(ctx);
    this.drawDungeonRightWall(ctx);
    this.drawDungeonBottomWall(ctx);

    // Arena boundary indicator - glowing border around playable area
    const arenaLeft = 40;
    const arenaRight = 960;
    const arenaTop = 40;
    const arenaBottom = 760;
    const time = Date.now() * 0.005;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 165, 0, ${0.6 + Math.sin(time) * 0.2})`; // Orange glow
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.lineDashOffset = time * 10;

    // Draw arena boundary rectangle
    ctx.strokeRect(arenaLeft, arenaTop, arenaRight - arenaLeft, arenaBottom - arenaTop);

    // Inner glow effect
    ctx.strokeStyle = `rgba(255, 165, 0, ${0.3 + Math.sin(time + 1) * 0.1})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(arenaLeft, arenaTop, arenaRight - arenaLeft, arenaBottom - arenaTop);

    // Corner markers for extra visibility
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255, 165, 0, ${0.8 + Math.sin(time) * 0.2})`;
    const markerSize = 8;

    // Corner markers
    ctx.fillRect(arenaLeft - markerSize/2, arenaTop - markerSize/2, markerSize, markerSize);
    ctx.fillRect(arenaRight - markerSize/2, arenaTop - markerSize/2, markerSize, markerSize);
    ctx.fillRect(arenaLeft - markerSize/2, arenaBottom - markerSize/2, markerSize, markerSize);
    ctx.fillRect(arenaRight - markerSize/2, arenaBottom - markerSize/2, markerSize, markerSize);

    ctx.restore();
}

drawInfiniteLeftWall(ctx) {
    // Left wall - infinite dungeon corridors extending upward
    const wallWidth = 40;
    const time = Date.now() * 0.001;
    const infiniteExtension = 120; // Always extend 120 pixels for infinite effect

    // Base wall (extended for infinite effect)
    const wallGradient = ctx.createLinearGradient(0, 0, wallWidth, 0);
    wallGradient.addColorStop(0, '#1a1a1a');
    wallGradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = wallGradient;
    ctx.fillRect(-infiniteExtension, -infiniteExtension, wallWidth + infiniteExtension, this.worldHeight + infiniteExtension);

    // Infinite corridor effect - repeating archways (always extended)
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;

    for (let y = -20 - infiniteExtension; y < this.worldHeight + infiniteExtension; y += 60) {
        // Archway outline
        ctx.beginPath();
        ctx.moveTo(-infiniteExtension, y);
        ctx.lineTo(-infiniteExtension + wallWidth * 0.3, y);
        ctx.quadraticCurveTo(-infiniteExtension + wallWidth * 0.5, y - 15, -infiniteExtension + wallWidth * 0.7, y);
        ctx.lineTo(-infiniteExtension + wallWidth, y);
        ctx.stroke();

        // Side pillars
        ctx.fillStyle = '#151515';
        ctx.fillRect(-infiniteExtension, y, 8, 40);
        ctx.fillRect(-infiniteExtension + wallWidth - 8, y, 8, 40);

        // Depth lines for infinite effect
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let depth = 1; depth <= 4; depth++) {
            const offset = depth * 3;
            ctx.beginPath();
            ctx.moveTo(-infiniteExtension + offset, y + 5);
            ctx.lineTo(-infiniteExtension + wallWidth - offset, y + 5);
            ctx.stroke();
        }
    }

    // Flickering torch lights in corridors (always extended)
    for (let y = 20 - infiniteExtension; y < this.worldHeight + infiniteExtension; y += 40) {
        const torchX = -infiniteExtension + wallWidth * 0.5;
        const torchY = y - 5;
        const flicker = 0.7 + Math.sin(time * 8 + y * 0.1) * 0.3;

        const torchGradient = ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, 8);
        torchGradient.addColorStop(0, `rgba(255, 150, 0, ${flicker})`);
        torchGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = torchGradient;
        ctx.beginPath();
        ctx.arc(torchX, torchY, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add layered depth effect for stronger infinite illusion
    ctx.globalAlpha = 0.7;
    for (let layer = 1; layer <= 3; layer++) {
        const layerOffset = layer * 80;
        const layerAlpha = 0.3 / layer;

        ctx.strokeStyle = `rgba(42, 42, 42, ${layerAlpha})`;
        ctx.lineWidth = 1;

        for (let y = -20 - infiniteExtension + layerOffset; y < this.worldHeight + infiniteExtension - layerOffset; y += 60) {
            ctx.beginPath();
            ctx.moveTo(-infiniteExtension + layerOffset, y);
            ctx.lineTo(-infiniteExtension + wallWidth - layerOffset, y);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1.0;
}

drawInfiniteTopWall(ctx) {
    // Top wall - infinite dungeon corridors extending leftward
    const wallHeight = 40;
    const time = Date.now() * 0.001;
    const infiniteExtension = 120; // Always extend 120 pixels for infinite effect

    // Base wall (extended for infinite effect)
    const wallGradient = ctx.createLinearGradient(0, 0, 0, wallHeight);
    wallGradient.addColorStop(0, '#1a1a1a');
    wallGradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = wallGradient;
    ctx.fillRect(-infiniteExtension, -infiniteExtension, this.worldWidth + infiniteExtension, wallHeight + infiniteExtension);

    // Infinite corridor effect - repeating doorways (always extended)
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;

    for (let x = -20 - infiniteExtension; x < this.worldWidth + infiniteExtension; x += 80) {
        // Doorway arch
        ctx.beginPath();
        ctx.moveTo(x, -infiniteExtension);
        ctx.lineTo(x, -infiniteExtension + wallHeight * 0.3);
        ctx.quadraticCurveTo(x + 20, -infiniteExtension + wallHeight * 0.1, x + 40, -infiniteExtension + wallHeight * 0.3);
        ctx.lineTo(x + 40, -infiniteExtension);
        ctx.stroke();

        // Door frame
        ctx.fillStyle = '#151515';
        ctx.fillRect(x, -infiniteExtension, 40, 8);
        ctx.fillRect(x, -infiniteExtension + wallHeight - 8, 40, 8);

        // Depth lines for infinite effect
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let depth = 1; depth <= 4; depth++) {
            const offset = depth * 2;
            ctx.beginPath();
            ctx.moveTo(x + 5, -infiniteExtension + offset);
            ctx.lineTo(x + 35, -infiniteExtension + offset);
            ctx.stroke();
        }
    }

    // Ceiling torches (always extended)
    for (let x = 40 - infiniteExtension; x < this.worldWidth + infiniteExtension; x += 80) {
        const torchX = x + 20;
        const torchY = -infiniteExtension + wallHeight * 0.5;
        const flicker = 0.7 + Math.sin(time * 8 + x * 0.1) * 0.3;

        const torchGradient = ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, 6);
        torchGradient.addColorStop(0, `rgba(255, 150, 0, ${flicker})`);
        torchGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = torchGradient;
        ctx.beginPath();
        ctx.arc(torchX, torchY, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add layered depth effect for stronger infinite illusion
    ctx.globalAlpha = 0.7;
    for (let layer = 1; layer <= 3; layer++) {
        const layerOffset = layer * 80;
        const layerAlpha = 0.3 / layer;

        ctx.strokeStyle = `rgba(42, 42, 42, ${layerAlpha})`;
        ctx.lineWidth = 1;

        for (let x = -20 - infiniteExtension + layerOffset; x < this.worldWidth + infiniteExtension - layerOffset; x += 80) {
            ctx.beginPath();
            ctx.moveTo(x, -infiniteExtension + layerOffset);
            ctx.lineTo(x + 40, -infiniteExtension + layerOffset);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1.0;
}

drawDungeonRightWall(ctx) {
    // Right wall - traditional dungeon wall
    const wallGradient = ctx.createLinearGradient(this.worldWidth - 40, 0, this.worldWidth, 0);
    wallGradient.addColorStop(0, '#2b2b2b');
    wallGradient.addColorStop(1, '#151515');
    ctx.fillStyle = wallGradient;
    ctx.fillRect(this.worldWidth - 40, 0, 40, this.worldHeight);

    // Stone bricks pattern
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2;
    for (let y = 0; y < this.worldHeight; y += 20) {
        if (y >= 40 && y <= this.worldHeight - 40) {
            ctx.strokeRect(this.worldWidth - 40, y, 40, 20);
        }
    }
}

drawDungeonBottomWall(ctx) {
    // Bottom wall - traditional dungeon wall
    const wallGradient = ctx.createLinearGradient(0, this.worldHeight - 40, 0, this.worldHeight);
    wallGradient.addColorStop(0, '#2b2b2b');
    wallGradient.addColorStop(1, '#151515');
    ctx.fillStyle = wallGradient;
    ctx.fillRect(0, this.worldHeight - 40, this.worldWidth, 40);

    // Stone bricks pattern
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2;
    for (let x = 0; x < this.worldWidth; x += 40) {
        if (x >= 40 && x <= this.worldWidth - 40) {
            ctx.strokeRect(x, this.worldHeight - 40, 40, 20);
        }
    }
}

drawDungeonTorches() {
    const ctx = this.ctx;
    const torches = [
        { x: 100, y: 80 },
        { x: 900, y: 80 },
        { x: 100, y: 720 },
        { x: 900, y: 720 },
        { x: 500, y: 60 },
    ];

    torches.forEach(t => {
        // Torch holder
        ctx.fillStyle = '#222';
        ctx.fillRect(t.x - 3, t.y - 5, 6, 12);

        // Flame animation (flicker)
        const flicker = Math.random() * 0.3 + 0.7;
        const flameGradient = ctx.createRadialGradient(t.x, t.y - 10, 0, t.x, t.y - 10, 10);
        flameGradient.addColorStop(0, `rgba(255, 200, 50, ${flicker})`);
        flameGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(t.x, t.y - 10, 10, 0, Math.PI * 2);
        ctx.fill();
    });
}

drawDungeonLighting() {
    const ctx = this.ctx;
    // Global dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Local light sources (soft yellow)
    const lights = [
        { x: 100, y: 80, r: 100 },
        { x: 900, y: 80, r: 100 },
        { x: 500, y: 60, r: 120 },
        { x: 100, y: 720, r: 100 },
        { x: 900, y: 720, r: 100 },
    ];

    lights.forEach(l => {
        const light = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        light.addColorStop(0, 'rgba(255,200,100,0.3)');
        light.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = light;
        ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    });
}

    
    drawGameStateMessages() {
        // Only delay boss death message; show player death message immediately
        if (this.deathTimer > 0 && this.gameState !== 'gameOver') return;
        
        this.ctx.save();
        this.ctx.font = '30px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'bossDefeated') {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillText('BOSS DEFEATED!', this.width / 2, this.height / 2);
            this.ctx.font = '16px Courier New';
            this.ctx.fillText('Herb has saved the day!', this.width / 2, this.height / 2 + 40);
        } else if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
            this.ctx.font = '16px Courier New';
            this.ctx.fillText('Refresh page to try again', this.width / 2, this.height / 2 + 40);
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
        this.speed = 2.5;
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
        
        // Shooting angle for arm aiming
        this.shootingAngle = 0;
        
        // Weapon system
        this.currentWeapon = 'normal'; // 'normal', 'onion'
        this.weapons = {
            normal: { cooldown: 200, damage: 8 },
            onion: { cooldown: 300, damage: 12 }
        };
        
        // Recoil system
        this.recoilOffset = 0;
        this.maxRecoil = 8; // Maximum recoil distance
        this.recoilRecovery = 0.3; // How fast recoil recovers
    }
    
    update(keys, mouse, boss) {
        // Store mouse reference for weapon drawing
        this.mouse = mouse;
        
        // Calculate distance to boss for speed boost
        const dx = boss.x - this.x;
        const dy = boss.y - this.y;
        const distanceToBoss = Math.sqrt(dx * dx + dy * dy);
        
        // Speed boost when boss is close (within 150 pixels)
        const baseSpeed = 2.5;
        const boostSpeed = 3.5;
        const boostDistance = 150;
        this.speed = distanceToBoss <= boostDistance ? boostSpeed : baseSpeed;
        
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
        
        // Update recoil recovery
        this.recoilOffset *= (1 - this.recoilRecovery);
        if (Math.abs(this.recoilOffset) < 0.1) {
            this.recoilOffset = 0;
        }
        
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
        return Date.now() - this.lastShot > this.weapons[this.currentWeapon].cooldown;
    }
    
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
    }
    
    isHit(x, y) {
        return x > this.x - this.width/2 && x < this.x + this.width/2 &&
               y > this.y - this.height/2 && y < this.y + this.height/2;
    }
    
    draw(ctx, camera = { x: 0, y: 0 }) {
        ctx.save();
        
        // Draw shadow first
        this.drawShadow(ctx);
        
        // Draw Hebrado (enhanced pixel art with 2.5D effect)
        // Body with depth
        this.drawPlayerBody(ctx);
        
        // Head with better detail
        this.drawPlayerHead(ctx);
        
        // Equipment and accessories
        this.drawPlayerEquipment(ctx, camera);
        
        // Health bar with 3D effect
        this.drawPlayerHealthBar(ctx);
        
        // Draw player name
        this.drawPlayerName(ctx);
        
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
        
        // Left hand
        ctx.fillStyle = '#ffdbac';
        ctx.fillRect(this.x - 13, leftArmY + 4, 3, 3);
        
        // Right arm - follows shooting direction when auto-aiming
        ctx.save();
        ctx.translate(this.x + 10, bodyY - 6); // Pivot point at shoulder
        
        if (this.shootingAngle !== 0) {
            // Rotate arm to shooting angle
            ctx.rotate(this.shootingAngle);
        } else {
            // Default position with walking animation
            ctx.translate(0, rightArmOffset);
        }
        
        // Draw rotated arm
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(-2, 0, 4, 10);
        
        // Draw rotated hand
        ctx.fillStyle = '#ffdbac';
        ctx.fillRect(-1.5, 4, 3, 3);
        
        // Draw gun in right hand
        if (this.currentWeapon === 'onion') {
            // Onion Gun - special appearance
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(2, 3, 17, 7); // Gun body (larger)
            ctx.fillStyle = '#654321';
            ctx.fillRect(17, 4, 12, 5); // Gun barrel (larger)
            // Onion details
            ctx.fillStyle = '#228B22';
            ctx.fillRect(0, 5, 3, 2); // Green stem
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(4, 5, 2, 2); // White layer
            ctx.fillStyle = '#800080';
            ctx.fillRect(8, 5, 2, 2); // Purple core
        } else {
            // Normal Gun
            ctx.fillStyle = '#666';
            ctx.fillRect(2, 4, 15, 5); // Gun body (larger)
            ctx.fillStyle = '#333';
            ctx.fillRect(15, 5, 10, 3); // Gun barrel (larger)
            ctx.fillStyle = '#444';
            ctx.fillRect(0, 6, 5, 7); // Gun handle (larger)
        }
        
        ctx.restore();
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
    
    drawPlayerEquipment(ctx, camera) {
        // Equipment and accessories (gun is now drawn in the right hand)
        
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
    
    drawPlayerName(ctx) {
        // Draw player name above head
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ff99';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText('Herb', this.x, this.y - 35);
        ctx.fillText('Herb', this.x, this.y - 35);
    }
}

class Boss {
    constructor(x, y, game) {
        this.game = game; // Store reference to game instance
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
        this.spiralCooldown = 0;
        this.laserCooldown = 0;
        this.poundCooldown = 0;
        this.teleportCooldown = 0;
        this.shieldActive = false;
        this.shieldCooldown = 0;
        this.originalSpeed = this.speed;
        this.phase = 1; // Boss phases based on health
        
        // Spiral attack variables
        this.spiralAngle = 0;
        this.spiralBulletsShot = 0;
        
        // New attack variables
        this.laserAngle = 0;
        this.laserActive = false;
        this.laserChargeTime = 0;
        this.poundRadius = 0;
        this.poundActive = false;
        this.teleportTargetX = 0;
        this.teleportTargetY = 0;
        this.teleportPhase = 0; // 0: charging, 1: teleporting, 2: attacking
        
        // Reference to player for movement calculations
        this.player = null;
    }
    
    update(player) {
        // Don't update if boss is dead
        if (this.health <= 0) return;
        
        // Store player reference for movement calculations
        this.player = player;
        
        const oldX = this.x;
        const oldY = this.y;
        
        // Update phase based on health
        this.updatePhase();
        
        // Update cooldowns
        this.attackCooldown = Math.max(0, this.attackCooldown - 1);
        this.dashCooldown = Math.max(0, this.dashCooldown - 1);
        this.burstCooldown = Math.max(0, this.burstCooldown - 1);
        this.spiralCooldown = Math.max(0, this.spiralCooldown - 1);
        this.laserCooldown = Math.max(0, this.laserCooldown - 1);
        this.poundCooldown = Math.max(0, this.poundCooldown - 1);
        this.teleportCooldown = Math.max(0, this.teleportCooldown - 1);
        this.shieldCooldown = Math.max(0, this.shieldCooldown - 1);
        
        // Only choose new attacks if boss has significant health left
        if (this.health > 10) {
            // Choose attack pattern
            this.chooseAttackPattern(player);
        } else {
            // Boss is critically wounded - switch to normal movement only
            this.currentAttack = 'normal';
        }
        
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
        if (this.phase >= 3 && this.teleportCooldown === 0) {
            this.currentAttack = 'teleport';
            this.attackCooldown = 240; // 4 seconds
            this.teleportCooldown = 480; // 8 seconds
            this.teleportPhase = 0;
        } else if (this.phase >= 3 && this.laserCooldown === 0) {
            this.currentAttack = 'laser';
            this.attackCooldown = 300; // 5 seconds
            this.laserCooldown = 600; // 10 seconds
            this.laserActive = false;
            this.laserChargeTime = 0;
        } else if (this.phase >= 2 && this.poundCooldown === 0 && distanceToPlayer < 150) {
            this.currentAttack = 'pound';
            this.attackCooldown = 180; // 3 seconds
            this.poundCooldown = 360; // 6 seconds
            this.poundRadius = 0;
            this.poundActive = false;
        } else if (this.phase >= 3 && this.spiralCooldown === 0) {
            this.currentAttack = 'spiral';
            this.attackCooldown = 180; // 3 seconds
            this.spiralCooldown = 400; // 6.67 seconds
            this.spiralAngle = 0;
            this.spiralBulletsShot = 0;
        } else if (this.phase >= 2 && this.dashCooldown === 0 && distanceToPlayer > 150) {
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
            case 'spiral':
                this.executeSpiral(player);
                break;
            case 'laser':
                this.executeLaser(player);
                break;
            case 'pound':
                this.executePound(player);
                break;
            case 'teleport':
                this.executeTeleport(player);
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
    
    executeSpiral(player) {
        // Spiral attack - shoots bullets in expanding spiral pattern
        if (this.spiralBulletsShot < 24) { // Shoot 24 bullets in spiral
            const angle = this.spiralAngle;
            const distance = 30 + (this.spiralBulletsShot * 2); // Expanding spiral
            
            const bulletX = this.x + Math.cos(angle) * distance;
            const bulletY = this.y + Math.sin(angle) * distance;
            
            // Calculate direction towards player with some randomness
            const playerAngle = Math.atan2(player.y - bulletY, player.x - bulletX);
            const spread = (Math.random() - 0.5) * 0.5; // Small random spread
            const finalAngle = playerAngle + spread;
            
            // Create bullet at spiral position
            const bullet = new Bullet(bulletX, bulletY, finalAngle, 'boss');
            this.game.enemyBullets.push(bullet);
            
            this.spiralAngle += Math.PI / 6; // 30 degrees per bullet
            this.spiralBulletsShot++;
            
            // Reset for next spiral if complete
            if (this.spiralBulletsShot >= 24) {
                this.spiralBulletsShot = 0;
            }
        } else {
            // Move normally during spiral cooldown
            this.executeNormalMovement();
        }
    }
    
    executeLaser(player) {
        // Laser sweep attack
        if (!this.laserActive) {
            // Charging phase
            this.laserChargeTime++;
            if (this.laserChargeTime >= 60) { // 1 second charge
                this.laserActive = true;
                this.laserAngle = Math.atan2(player.y - this.y, player.x - this.x);
                this.laserChargeTime = 0;
            }
            // Stay still while charging
            return;
        }
        
        // Active laser phase - sweep across
        this.laserAngle += 0.05; // Slow sweep speed
        
        // Create laser damage along the beam
        const laserLength = 300;
        const damageStep = 20;
        
        for (let i = 0; i < laserLength; i += damageStep) {
            const damageX = this.x + Math.cos(this.laserAngle) * i;
            const damageY = this.y + Math.sin(this.laserAngle) * i;
            
            // Check if player is hit by laser
            const dx = damageX - player.x;
            const dy = damageY - player.y;
            if (Math.sqrt(dx * dx + dy * dy) < damageStep / 2) {
                player.takeDamage(2); // Continuous damage
            }
        }
        
        // End laser after full sweep
        if (Math.abs(this.laserAngle - Math.atan2(player.y - this.y, player.x - this.x)) > Math.PI) {
            this.laserActive = false;
        }
    }
    
    executePound(player) {
        // Ground pound attack
        if (!this.poundActive) {
            // Charging phase - stay still
            this.poundActive = true;
            this.poundRadius = 0;
            return;
        }
        
        // Expanding shockwave
        this.poundRadius += 4;
        
        if (this.poundRadius < 200) {
            // Check if player is hit by shockwave
            const distanceToPlayer = Math.sqrt(
                Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
            );
            
            if (Math.abs(distanceToPlayer - this.poundRadius) < 10) {
                player.takeDamage(3); // Damage from shockwave
            }
        } else {
            // End pound attack
            this.poundActive = false;
            this.poundRadius = 0;
        }
    }
    
    executeTeleport(player) {
        // Teleport strike attack
        switch (this.teleportPhase) {
            case 0: // Charging phase
                this.teleportPhase = 1;
                // Calculate teleport destination near player
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 40;
                this.teleportTargetX = player.x + Math.cos(angle) * distance;
                this.teleportTargetY = player.y + Math.sin(angle) * distance;
                // Keep within bounds
                this.teleportTargetX = Math.max(100, Math.min(this.teleportTargetX, this.game.worldWidth - 100));
                this.teleportTargetY = Math.max(100, Math.min(this.teleportTargetY, this.game.worldHeight - 100));
                break;
                
            case 1: // Teleporting
                // Instantly move to target location
                this.x = this.teleportTargetX;
                this.y = this.teleportTargetY;
                this.teleportPhase = 2;
                break;
                
            case 2: // Attack phase - quick burst of bullets
                // Shoot 8 bullets in all directions
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const bullet = new Bullet(this.x, this.y, angle, 'boss');
                    this.game.enemyBullets.push(bullet);
                }
                this.teleportPhase = 0; // Reset for next use
                break;
        }
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
        // Movement that keeps boss closer to player
        const distanceToPlayer = Math.sqrt(
            Math.pow(this.player.x - this.x, 2) + Math.pow(this.player.y - this.y, 2)
        );
        
        // If too far from player, move towards them
        if (distanceToPlayer > 200) {
            const angle = Math.atan2(this.player.y - this.y, this.player.x - this.x);
            this.x += Math.cos(angle) * this.speed * 1.5;
            this.y += Math.sin(angle) * this.speed * 1.5;
        } else if (distanceToPlayer < 80) {
            // If too close, move away slightly
            const angle = Math.atan2(this.y - this.player.y, this.x - this.player.x);
            this.x += Math.cos(angle) * this.speed * 0.8;
            this.y += Math.sin(angle) * this.speed * 0.8;
        } else {
            // Normal random movement when at good distance
            this.moveTimer++;
            if (this.moveTimer > 90) {
                this.moveDirection = Math.random() * Math.PI * 2;
                this.moveTimer = 0;
            }
            
            this.x += Math.cos(this.moveDirection) * this.speed * 0.7;
            this.y += Math.sin(this.moveDirection) * this.speed * 0.7;
        }
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
        // Don't draw if boss is dead
        if (this.health <= 0) return;
        
        ctx.save();
        
        // Draw shadow for depth
        this.drawBossShadow(ctx);
        
        // Draw aura behind the boss for more intimidating effect
        this.drawBossAura(ctx);
        
        // Draw Pineda (enhanced boss with curly hair and 2.5D effects)
        this.drawBossBody(ctx);
        this.drawBossHead(ctx);
        this.drawBossEquipment(ctx);
        this.drawBossHealthBar(ctx);
        
        // Draw attack effects
        if (this.currentAttack === 'laser' && this.laserActive) {
            this.drawLaser(ctx);
        }
        if (this.currentAttack === 'pound' && this.poundActive) {
            this.drawPoundShockwave(ctx);
        }
        if (this.currentAttack === 'teleport' && this.teleportPhase === 1) {
            this.drawTeleportEffect(ctx);
        }
        
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
        ctx.save();
        const time = Date.now() * 0.001;

        // Draw terrifying void field first (behind the boss)
        this.drawVoidField(ctx, time);

        // Multiple layered auras for maximum intimidation
        this.drawBloodAura(ctx, time);
        this.drawTerrorAura(ctx, time);
        this.drawCursedRunes(ctx, time);

        ctx.restore();
    }

    drawVoidField(ctx, time) {
        // Terrifying void field - absolute darkness and emptiness
        const fieldRadius = 90 + Math.sin(time * 1.2) * 12;
        const voidSpeed = time * 0.3;

        // Create terrifying void gradient
        const voidGradient = ctx.createRadialGradient(
            this.x + Math.cos(voidSpeed) * 15,
            this.y + Math.sin(voidSpeed) * 15,
            0,
            this.x, this.y, fieldRadius
        );
        voidGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)'); // Pure darkness
        voidGradient.addColorStop(0.3, 'rgba(20, 0, 0, 0.6)'); // Dark blood
        voidGradient.addColorStop(0.6, 'rgba(50, 0, 0, 0.4)'); // Crimson void
        voidGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)'); // Fading darkness

        ctx.fillStyle = voidGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, fieldRadius, 0, Math.PI * 2);
        ctx.fill();

        // Add terrifying void rings that pulse with menace
        for (let i = 0; i < 4; i++) {
            const ringRadius = 25 + i * 20 + Math.sin(time * 2.5 + i * 1.5) * 8;
            const ringAlpha = 0.4 + Math.sin(time * 4 + i * 2) * 0.3;

            ctx.strokeStyle = `rgba(139, 0, 0, ${ringAlpha})`; // Dark red
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawBloodAura(ctx, time) {
        // Blood aura - dripping crimson energy of death
        const bloodRadius = 65 + Math.sin(time * 3) * 10;
        const bloodIntensity = 0.4 + Math.sin(time * 2.2) * 0.25;

        const bloodGradient = ctx.createRadialGradient(this.x, this.y, 15, this.x, this.y, bloodRadius);
        bloodGradient.addColorStop(0, 'rgba(139, 0, 0, 0)'); // No blood at center
        bloodGradient.addColorStop(0.5, `rgba(139, 0, 0, ${bloodIntensity * 0.9})`); // Deep crimson
        bloodGradient.addColorStop(0.7, `rgba(220, 20, 60, ${bloodIntensity * 0.7})`); // Crimson red
        bloodGradient.addColorStop(1, `rgba(178, 34, 52, ${bloodIntensity * 0.4})`); // Firebrick

        ctx.fillStyle = bloodGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, bloodRadius, 0, Math.PI * 2);
        ctx.fill();

        // Blood tendrils that reach out like claws
        ctx.strokeStyle = `rgba(139, 0, 0, ${bloodIntensity * 0.8})`;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + time * 0.4;
            const length = 40 + Math.sin(time * 2.5 + i) * 12;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            // Create jagged, claw-like tendrils
            for (let j = 1; j <= 4; j++) {
                const segmentX = this.x + Math.cos(angle + Math.sin(time * 3 + j) * 0.3) * (length * j / 4);
                const segmentY = this.y + Math.sin(angle + Math.sin(time * 3 + j) * 0.3) * (length * j / 4);
                ctx.lineTo(segmentX, segmentY);
            }
            ctx.stroke();
        }
    }

    drawTerrorAura(ctx, time) {
        // Terror aura - chaotic, maddening energy that instills fear
        const terrorRadius = 55 + Math.sin(time * 4) * 7;
        const terrorIntensity = 0.5 + Math.sin(time * 3.5) * 0.3;

        // Chaotic multi-colored terror gradient
        const terrorGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, terrorRadius);
        terrorGradient.addColorStop(0, `rgba(128, 0, 128, ${terrorIntensity})`); // Purple terror
        terrorGradient.addColorStop(0.25, `rgba(139, 0, 0, ${terrorIntensity * 0.9})`); // Dark red
        terrorGradient.addColorStop(0.5, `rgba(0, 0, 0, ${terrorIntensity * 0.8})`); // Void black
        terrorGradient.addColorStop(0.75, `rgba(75, 0, 130, ${terrorIntensity * 0.7})`); // Indigo madness
        terrorGradient.addColorStop(1, `rgba(139, 0, 0, ${terrorIntensity * 0.5})`); // Crimson

        ctx.fillStyle = terrorGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, terrorRadius, 0, Math.PI * 2);
        ctx.fill();

        // Maddening sparks that flicker chaotically
        for (let i = 0; i < 8; i++) {
            const sparkAngle = (i / 8) * Math.PI * 2 + time * 3;
            const sparkDistance = 30 + Math.random() * 20;
            const sparkX = this.x + Math.cos(sparkAngle) * sparkDistance;
            const sparkY = this.y + Math.sin(sparkAngle) * sparkDistance;
            const sparkSize = 3 + Math.sin(time * 6 + i) * 2;

            // Random terrifying colors
            const colors = ['#8B0000', '#800080', '#000000', '#4B0082', '#DC143C'];
            ctx.fillStyle = colors[i % colors.length];
            ctx.globalAlpha = 0.7 + Math.sin(time * 4 + i) * 0.3;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    drawCursedRunes(ctx, time) {
        // Cursed runes - ancient symbols of doom and despair
        ctx.strokeStyle = 'rgba(139, 0, 0, 0.9)'; // Dark red runes
        ctx.lineWidth = 2.5;

        const runeCount = 6;
        for (let i = 0; i < runeCount; i++) {
            const runeAngle = (i / runeCount) * Math.PI * 2 + time * 0.15;
            const runeDistance = 70 + Math.sin(time * 1.8 + i) * 8;
            const runeX = this.x + Math.cos(runeAngle) * runeDistance;
            const runeY = this.y + Math.sin(runeAngle) * runeDistance;
            const runeSize = 10 + Math.sin(time * 2.5 + i) * 3;

            // Draw terrifying rune symbols (stylized skulls/crosses)
            ctx.save();
            ctx.translate(runeX, runeY);
            ctx.rotate(time + i);

            // Draw skull-like rune
            ctx.beginPath();
            // Skull outline
            ctx.moveTo(-runeSize * 0.3, -runeSize * 0.5);
            ctx.lineTo(runeSize * 0.3, -runeSize * 0.5);
            ctx.lineTo(runeSize * 0.4, -runeSize * 0.2);
            ctx.lineTo(runeSize * 0.3, 0);
            ctx.lineTo(runeSize * 0.1, runeSize * 0.2);
            ctx.lineTo(-runeSize * 0.1, runeSize * 0.2);
            ctx.lineTo(-runeSize * 0.3, 0);
            ctx.lineTo(-runeSize * 0.4, -runeSize * 0.2);
            ctx.closePath();
            ctx.stroke();

            // Eye sockets
            ctx.beginPath();
            ctx.arc(-runeSize * 0.15, -runeSize * 0.3, runeSize * 0.08, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(runeSize * 0.15, -runeSize * 0.3, runeSize * 0.08, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
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
    
    drawLaser(ctx) {
        ctx.save();
        
        // Draw laser beam
        const laserLength = 300;
        const laserWidth = 8;
        
        // Laser beam gradient
        const laserGradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x + Math.cos(this.laserAngle) * laserLength,
            this.y + Math.sin(this.laserAngle) * laserLength
        );
        laserGradient.addColorStop(0, 'rgba(255, 0, 255, 0.9)');
        laserGradient.addColorStop(0.5, 'rgba(255, 100, 255, 0.8)');
        laserGradient.addColorStop(1, 'rgba(255, 200, 255, 0.3)');
        
        ctx.strokeStyle = laserGradient;
        ctx.lineWidth = laserWidth;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.laserAngle) * laserLength,
            this.y + Math.sin(this.laserAngle) * laserLength
        );
        ctx.stroke();
        
        // Laser glow effect
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
        ctx.lineWidth = laserWidth * 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawPoundShockwave(ctx) {
        ctx.save();
        
        // Draw expanding shockwave rings
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
            const ringRadius = this.poundRadius - i * 20;
            if (ringRadius > 0) {
                const alpha = Math.max(0, 1 - (ringRadius / 200));
                
                ctx.strokeStyle = `rgba(255, 255, 0, ${alpha * 0.8})`;
                ctx.lineWidth = 4 - i;
                ctx.beginPath();
                ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner glow
                ctx.strokeStyle = `rgba(255, 255, 100, ${alpha * 0.4})`;
                ctx.lineWidth = 8 - i * 2;
                ctx.stroke();
            }
        }
        
        // Ground impact effect
        if (this.poundRadius < 50) {
            ctx.fillStyle = 'rgba(150, 100, 50, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y + 15, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawTeleportEffect(ctx) {
        ctx.save();
        const time = Date.now() * 0.01;
        
        // Teleport particle effect
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + time * 0.2;
            const distance = 20 + Math.sin(time * 2 + i) * 10;
            const particleX = this.x + Math.cos(angle) * distance;
            const particleY = this.y + Math.sin(angle) * distance;
            
            const alpha = 0.8 + Math.sin(time * 3 + i) * 0.2;
            ctx.fillStyle = `rgba(150, 0, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Particle trail
            ctx.strokeStyle = `rgba(200, 100, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(particleX, particleY);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle, type) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = type === 'player' ? 8 : type === 'onion' ? 6 : 4;
        this.type = type;
        this.lifetime = 0;
        this.maxLifetime = 240; // 2 seconds at 60fps
        this.size = type === 'player' ? 8 : type === 'onion' ? 10 : 6.5;
        this.damage = type === 'onion' ? 12 : 8;
    }
    
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.lifetime++;
    }
    
    shouldRemove() {
        return this.lifetime > this.maxLifetime ||
               this.x < -100 || this.x > 2100 || this.y < -100 || this.y > 1700;
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
            
        } else if (this.type === 'onion') {
            // Onion bullet - layered vegetable projectile
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 6;
            
            // Onion layers (multiple concentric circles)
            const layers = 4;
            for (let i = 0; i < layers; i++) {
                const layerSize = this.size * (0.3 + (i / layers) * 0.7);
                const alpha = 0.8 - (i / layers) * 0.3;
                
                const onionGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, layerSize);
                if (i === 0) {
                    // Outer brown skin
                    onionGradient.addColorStop(0, `rgba(139, 69, 19, ${alpha})`);
                    onionGradient.addColorStop(1, `rgba(160, 82, 45, ${alpha * 0.5})`);
                } else if (i === 1) {
                    // White layer
                    onionGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                    onionGradient.addColorStop(1, `rgba(240, 240, 240, ${alpha * 0.5})`);
                } else {
                    // Inner purple layers
                    onionGradient.addColorStop(0, `rgba(128, 0, 128, ${alpha})`);
                    onionGradient.addColorStop(1, `rgba(75, 0, 130, ${alpha * 0.5})`);
                }
                
                ctx.fillStyle = onionGradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, layerSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Onion stem
            ctx.strokeStyle = '#228B22';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.size);
            ctx.lineTo(this.x, this.y - this.size - 3);
            ctx.stroke();
            
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
        this.maxLifetime = type === 'victory' ? 180 : type === 'explosion' ? 120 : 45;
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
            case 'explosion':
                this.color = '#ff6600';
                this.secondaryColor = '#ffaa00';
                this.size = Math.random() * 5 + 2;
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = (Math.random() - 0.5) * 8;
                break;
            case 'defeat':
                this.color = '#990000';
                this.secondaryColor = '#660000';
                this.size = Math.random() * 4 + 1;
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = (Math.random() - 0.5) * 4;
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
            
        } else if (this.type === 'explosion') {
            // Explosion particles - larger, more intense
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            
            // Draw multiple overlapping circles for explosion effect
            for (let i = 0; i < 3; i++) {
                const offsetSize = currentSize * (0.5 + i * 0.3);
                ctx.beginPath();
                ctx.arc(0, 0, offsetSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
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

class HealthPickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 12;
        this.color = '#ff4444';
        this.animationFrame = 0;
    }
    
    update() {
        this.animationFrame += 1;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Bobbing animation
        const bobOffset = Math.sin(this.animationFrame * 0.1) * 2;
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y + bobOffset, 0,
            this.x, this.y + bobOffset, this.size * 2
        );
        gradient.addColorStop(0, this.color + '80');
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobOffset, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Heart shape
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Left half
        ctx.arc(this.x - 4, this.y + bobOffset - 2, 4, 0, Math.PI * 2);
        // Right half
        ctx.arc(this.x + 4, this.y + bobOffset - 2, 4, 0, Math.PI * 2);
        // Bottom triangle
        ctx.moveTo(this.x - 8, this.y + bobOffset);
        ctx.lineTo(this.x, this.y + bobOffset + 6);
        ctx.lineTo(this.x + 8, this.y + bobOffset);
        ctx.closePath();
        ctx.fill();
        
        // White highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y + bobOffset - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    applyEffect(player) {
        // Heal player
        player.health = Math.min(player.maxHealth, player.health + 30);
    }
}

class ShieldPickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 14;
        this.color = '#4488ff';
        this.animationFrame = 0;
    }
    
    update() {
        this.animationFrame += 1;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Bobbing animation
        const bobOffset = Math.sin(this.animationFrame * 0.1) * 2;
        
        // Shield glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y + bobOffset, 0,
            this.x, this.y + bobOffset, this.size * 2
        );
        gradient.addColorStop(0, this.color + '80');
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobOffset, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Shield shape
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        // Shield top curve
        ctx.arc(this.x, this.y + bobOffset - 4, 6, Math.PI, 0, false);
        // Shield sides
        ctx.lineTo(this.x + 8, this.y + bobOffset + 6);
        ctx.lineTo(this.x, this.y + bobOffset + 10);
        ctx.lineTo(this.x - 8, this.y + bobOffset + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Shield emblem
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobOffset, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    applyEffect(player) {
        // Give player temporary shield/increased max health
        player.maxHealth = Math.min(150, player.maxHealth + 20);
        player.health = Math.min(player.maxHealth, player.health + 20);
    }
}

class OnionPickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 12;
        this.color = '#ffaa00';
        this.animationFrame = 0;
    }
    
    update() {
        this.animationFrame += 1;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Bobbing animation
        const bobOffset = Math.sin(this.animationFrame * 0.1) * 2;
        
        // Onion glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y + bobOffset, 0,
            this.x, this.y + bobOffset, this.size * 2
        );
        gradient.addColorStop(0, this.color + '80');
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobOffset, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Onion shape - layered circles
        const layers = 3;
        for (let i = 0; i < layers; i++) {
            const layerSize = this.size * (0.4 + (i / layers) * 0.6);
            const alpha = 0.9 - (i / layers) * 0.2;
            
            if (i === 0) {
                // Outer brown skin
                ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
            } else if (i === 1) {
                // White layer
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            } else {
                // Inner purple layer
                ctx.fillStyle = `rgba(128, 0, 128, ${alpha})`;
            }
            
            ctx.beginPath();
            ctx.arc(this.x, this.y + bobOffset, layerSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Onion stem
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + bobOffset - this.size);
        ctx.lineTo(this.x, this.y + bobOffset - this.size - 4);
        ctx.stroke();
        
        ctx.restore();
    }
    
    applyEffect(player) {
        // Switch to onion gun
        player.currentWeapon = 'onion';
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});