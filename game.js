// Space Evaders Game Engine
class SpaceEvaders {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameRunning = false;
        this.gameStarted = false;
        this.keys = {};
        this.gameStartTime = null;
        
        // Game state
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.timeElapsed = 0;
        
        // Game objects
        this.player = null;
        this.bullets = [];
        this.aliens = [];
        this.explosions = [];
        this.particles = [];
        this.stars = [];
        
        // Game settings
        this.alienTypes = [
            { emoji: '👾', points: 10, speed: 0.8 },
            { emoji: '🛸', points: 20, speed: 1.0 },
            { emoji: '👽', points: 30, speed: 1.2 },
            { emoji: '🤖', points: 40, speed: 1.4 },
            { emoji: '👹', points: 50, speed: 1.6 }
        ];
        
        // Audio context for synth sounds
        this.audioContext = null;
        this.initAudio();
        
        this.init();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    playSound(type) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch (type) {
            case 'shoot':
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.type = 'square';
                break;
                
            case 'explosion':
                oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.type = 'sawtooth';
                break;
                
            case 'alienHit':
                oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                oscillator.type = 'triangle';
                break;
                
            case 'powerup':
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                oscillator.type = 'sine';
                break;
        }
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    init() {
        this.setupEventListeners();
        this.createStarField();
        this.createPlayer();
        this.createAlienWave();
        this.loadHighScores();
        this.startGame();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Initialize audio context on first user interaction
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.shoot();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Prevent default touch behaviors
        document.addEventListener('touchstart', (e) => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Global functions for HTML buttons
        window.saveHighScore = () => this.saveHighScore();
        window.startNewGame = () => this.resetGame();
        
        // Add Enter key support for name input
        document.addEventListener('DOMContentLoaded', () => {
            const playerNameInput = document.getElementById('playerName');
            if (playerNameInput) {
                playerNameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.saveHighScore();
                    }
                });
            }
        });
        
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const moveLeftBtn = document.getElementById('moveLeft');
        const moveRightBtn = document.getElementById('moveRight');
        const shootBtn = document.getElementById('shootBtn');
        
        if (moveLeftBtn && moveRightBtn && shootBtn) {
            // Left movement
            moveLeftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['ArrowLeft'] = true;
            });
            moveLeftBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys['ArrowLeft'] = false;
            });
            
            // Right movement
            moveRightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['ArrowRight'] = true;
            });
            moveRightBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys['ArrowRight'] = false;
            });
            
            // Shooting
            let shootInterval;
            shootBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.shoot();
                shootInterval = setInterval(() => {
                    this.shoot();
                }, 150); // Auto-fire while holding
            });
            shootBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (shootInterval) {
                    clearInterval(shootInterval);
                    shootInterval = null;
                }
            });
            
            // Prevent context menu on long press
            [moveLeftBtn, moveRightBtn, shootBtn].forEach(btn => {
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                });
            });
        }
    }
    
    createStarField() {
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 1,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    createPlayer() {
        this.player = {
            x: this.canvas.width / 2 - 20,
            y: this.canvas.height - 60,
            width: 40,
            height: 40,
            speed: 8,
            emoji: '🚀'
        };
    }
    
    createAlienWave() {
        this.aliens = [];
        const rows = 3 + Math.floor(this.level / 3);
        const cols = 8 + Math.floor(this.level / 2);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Randomize alien types with bias toward harder aliens in higher rows
                const baseTypeIndex = Math.min(row, this.alienTypes.length - 1);
                const randomOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                const alienTypeIndex = Math.max(0, Math.min(this.alienTypes.length - 1, baseTypeIndex + randomOffset));
                const alienType = this.alienTypes[alienTypeIndex];
                
                this.aliens.push({
                    x: col * 80 + 50,
                    y: row * 60 + 50,
                    width: 40,
                    height: 40,
                    speed: alienType.speed * (1 + this.level * 0.15),
                    direction: 1,
                    emoji: alienType.emoji,
                    points: alienType.points,
                    shootTimer: Math.random() * 120 // Reduced timer for more frequent shooting
                });
            }
        }
    }
    
    startGame() {
        this.gameRunning = true;
        if (!this.gameStarted) {
            this.gameStartTime = Date.now();
            this.gameStarted = true;
        }
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        this.update();
        this.render();
        this.updateUI();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.updatePlayer();
        this.updateBullets();
        this.updateAliens();
        this.updateExplosions();
        this.updateParticles();
        this.updateStars();
        this.checkCollisions();
        this.checkGameConditions();
        
        // Update timer
        if (this.gameStartTime) {
            this.timeElapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
        }
    }
    
    updatePlayer() {
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.y -= bullet.speed;
            
            if (bullet.y < 0) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateAliens() {
        let shouldDropDown = false;
        
        for (let alien of this.aliens) {
            alien.x += alien.direction * alien.speed;
            
            if (alien.x <= 0 || alien.x >= this.canvas.width - alien.width) {
                shouldDropDown = true;
            }
            
            // Alien shooting
            alien.shootTimer--;
            if (alien.shootTimer <= 0 && Math.random() < 0.005) {
                this.alienShoot(alien);
                alien.shootTimer = 60 + Math.random() * 120;
            }
        }
        
        if (shouldDropDown) {
            for (let alien of this.aliens) {
                alien.direction *= -1;
                alien.y += 30;
            }
        }
    }
    
    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life--;
            explosion.scale += 0.1;
            explosion.opacity -= 0.05;
            
            if (explosion.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            particle.opacity -= 0.02;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateStars() {
        for (let star of this.stars) {
            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        }
    }
    
    shoot() {
        if (this.gameRunning) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 10,
                speed: 12,
                emoji: '🔥'
            });
            this.playSound('shoot');
        }
    }
    
    alienShoot(alien) {
        this.bullets.push({
            x: alien.x + alien.width / 2 - 2,
            y: alien.y + alien.height,
            width: 4,
            height: 10,
            speed: -6,
            emoji: '💥',
            isAlienBullet: true
        });
    }
    
    checkCollisions() {
        // Player bullets vs aliens
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isAlienBullet) continue;
            
            for (let j = this.aliens.length - 1; j >= 0; j--) {
                const alien = this.aliens[j];
                
                if (this.isColliding(bullet, alien)) {
                    this.createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2);
                    this.createParticles(alien.x + alien.width / 2, alien.y + alien.height / 2);
                    this.score += alien.points;
                    this.bullets.splice(i, 1);
                    this.aliens.splice(j, 1);
                    this.playSound('alienHit');
                    break;
                }
            }
        }
        
        // Alien bullets vs player
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.isAlienBullet) continue;
            
            if (this.isColliding(bullet, this.player)) {
                this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                this.createParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                this.bullets.splice(i, 1);
                this.lives--;
                this.playSound('explosion');
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
                break;
            }
        }
        
        // Aliens vs player
        for (let alien of this.aliens) {
            if (this.isColliding(alien, this.player)) {
                this.gameOver();
                break;
            }
            
            if (alien.y + alien.height > this.canvas.height - 100) {
                this.gameOver();
                break;
            }
        }
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createExplosion(x, y) {
        this.explosions.push({
            x: x,
            y: y,
            scale: 0.5,
            opacity: 1,
            life: 20,
            emojis: ['💥', '🔥', '⭐', '✨']
        });
    }
    
    createParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                opacity: 1,
                color: `hsl(${Math.random() * 60 + 10}, 100%, 70%)`
            });
        }
    }
    
    checkGameConditions() {
        if (this.aliens.length === 0) {
            this.nextLevel();
        }
    }
    
    nextLevel() {
        this.level++;
        this.createAlienWave();
        // Bonus points for completing level
        this.score += this.level * 100;
        this.playSound('powerup');
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalTime').textContent = this.formatTime(this.timeElapsed);
    }
    
    render() {
        // Clear canvas with less trailing
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.drawStars();
        
        // Draw game objects
        this.drawPlayer();
        this.drawBullets();
        this.drawAliens();
        this.drawExplosions();
        this.drawParticles();
    }
    
    drawStars() {
        this.ctx.fillStyle = '#fff';
        for (let star of this.stars) {
            this.ctx.globalAlpha = star.opacity;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawPlayer() {
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.player.emoji,
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height
        );
    }
    
    drawBullets() {
        for (let bullet of this.bullets) {
            if (bullet.emoji) {
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(
                    bullet.emoji,
                    bullet.x + bullet.width / 2,
                    bullet.y + bullet.height
                );
            } else {
                this.ctx.fillStyle = bullet.isAlienBullet ? '#ff4444' : '#00ff00';
                this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            }
        }
    }
    
    drawAliens() {
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        for (let alien of this.aliens) {
            this.ctx.fillText(
                alien.emoji,
                alien.x + alien.width / 2,
                alien.y + alien.height
            );
        }
    }
    
    drawExplosions() {
        for (let explosion of this.explosions) {
            this.ctx.globalAlpha = explosion.opacity;
            this.ctx.font = `${40 * explosion.scale}px Arial`;
            this.ctx.textAlign = 'center';
            
            const emoji = explosion.emojis[Math.floor(explosion.life / 5) % explosion.emojis.length];
            this.ctx.fillText(emoji, explosion.x, explosion.y);
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawParticles() {
        for (let particle of this.particles) {
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
        }
        this.ctx.globalAlpha = 1;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('timer').textContent = this.formatTime(this.timeElapsed);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    saveHighScore() {
        try {
            const playerNameInput = document.getElementById('playerName');
            const playerName = (playerNameInput ? playerNameInput.value.trim() : '') || 'Anonymous';
            const highScores = this.getHighScores();
            
            highScores.push({
                name: playerName,
                score: this.score,
                time: this.timeElapsed,
                level: this.level,
                date: new Date().toLocaleDateString()
            });
            
            highScores.sort((a, b) => b.score - a.score);
            highScores.splice(10); // Keep only top 10
            
            localStorage.setItem('spaceEvadersHighScores', JSON.stringify(highScores));
            this.displayHighScores();
            
            const gameOverDiv = document.getElementById('gameOver');
            if (gameOverDiv) {
                gameOverDiv.style.display = 'none';
            }
            
            // Clear the input field
            if (playerNameInput) {
                playerNameInput.value = '';
            }
        } catch (error) {
            console.log('Error saving high score:', error);
            // Still hide the game over screen even if there's an error
            const gameOverDiv = document.getElementById('gameOver');
            if (gameOverDiv) {
                gameOverDiv.style.display = 'none';
            }
        }
    }
    
    getHighScores() {
        try {
            const saved = localStorage.getItem('spaceEvadersHighScores');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.log('Error loading high scores:', error);
            return [];
        }
    }
    
    loadHighScores() {
        this.displayHighScores();
    }
    
    displayHighScores() {
        try {
            const highScores = this.getHighScores();
            const container = document.getElementById('highScoresList');
            
            if (!container) {
                console.log('High scores container not found');
                return;
            }
            
            if (highScores.length === 0) {
                container.innerHTML = '<div>No scores yet!</div>';
                return;
            }
            
            container.innerHTML = highScores
                .slice(0, 5)
                .map((score, index) => `
                    <div class="high-score-entry">
                        <span>${index + 1}. ${score.name}</span>
                        <span>${score.score}</span>
                    </div>
                `).join('');
        } catch (error) {
            console.log('Error displaying high scores:', error);
        }
    }
    
    resetGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.timeElapsed = 0;
        this.gameStartTime = Date.now();
        this.bullets = [];
        this.explosions = [];
        this.particles = [];
        
        this.createPlayer();
        this.createAlienWave();
        
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('playerName').value = '';
        
        this.startGame();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new SpaceEvaders();
});