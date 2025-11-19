// Apnea Bohol - One Breath Descent
class ApneaDescender {
    constructor() {
        this.depth = 0;
        this.targetDepth = 0; // For smooth lerping
        this.maxDepth = 60;
        this.isHolding = false;
        this.holdStartTime = 0;
        this.holdDuration = 0;
        this.failedAttempts = 0;
        this.assistedMode = false;
        this.hasBooked = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDepth();
        this.animate();
    }

    setupEventListeners() {
        // Hold events - mouse
        document.addEventListener('mousedown', (e) => {
            // Don't trigger on form inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
                return;
            }
            this.startHold();
            this.createBubbles(e.clientX, e.clientY);
        });
        document.addEventListener('mouseup', () => this.endHold());

        // Hold events - keyboard
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isHolding) {
                e.preventDefault();
                this.startHold();
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.endHold();
            }
        });

        // Hold events - touch
        document.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
                return;
            }
            this.startHold();
        });
        document.addEventListener('touchend', () => this.endHold());

        // Scroll - slow and smooth (scroll a lot before things change)
        document.addEventListener('wheel', (e) => {
            this.targetDepth = Math.max(0, Math.min(this.maxDepth, this.targetDepth + e.deltaY * 0.005));
        });

        // Blackout click to retry
        document.getElementById('blackout').addEventListener('click', () => {
            this.resetDive();
        });

        // Book button
        document.getElementById('bookButton').addEventListener('click', () => {
            this.handleBooking();
        });
    }

    startHold() {
        if (this.hasBooked) return;
        this.isHolding = true;
        this.holdStartTime = Date.now();
    }

    endHold() {
        if (!this.isHolding) return;
        this.isHolding = false;
        // Just stop diving - scroll is always available for navigation
    }

    triggerBlackout() {
        this.failedAttempts++;

        const blackout = document.getElementById('blackout');
        const message = document.getElementById('blackoutMessage');

        if (this.failedAttempts >= 3) {
            message.innerHTML = `
                Try again when you're ready.<br><br>
                <span class="text-sm text-white/40">
                    Or <span class="underline cursor-pointer" id="assistedLink">freedive with instructor</span> (scroll mode)
                </span>
            `;

            setTimeout(() => {
                const link = document.getElementById('assistedLink');
                if (link) {
                    link.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.enableAssistedMode();
                    });
                }
            }, 100);
        } else {
            message.textContent = `Try again when you're ready. (${3 - this.failedAttempts} attempts remaining)`;
        }

        blackout.classList.add('active');
    }

    enableAssistedMode() {
        this.assistedMode = true;
        document.getElementById('assistedBadge').classList.add('visible');
        this.resetDive();

        // Slightly desaturate for assisted mode
        document.getElementById('surface').style.filter = 'saturate(0.7)';
    }

    resetDive() {
        document.getElementById('blackout').classList.remove('active');
        this.depth = 0;
        this.holdDuration = 0;
        this.updateDepth();
    }

    updateDepth() {
        // Update depth display
        document.getElementById('depthDisplay').textContent = Math.floor(this.depth);

        // Update background color based on depth
        const progress = this.depth / this.maxDepth;
        const hue = 200 - progress * 20;
        const saturation = 30 + progress * 20;
        const lightness = 40 - progress * 35;

        document.getElementById('surface').style.background = `
            linear-gradient(180deg,
                hsl(${hue}, ${saturation}%, ${lightness + 20}%) 0%,
                hsl(${hue}, ${saturation + 10}%, ${lightness + 10}%) 30%,
                hsl(${hue}, ${saturation + 15}%, ${lightness}%) 50%,
                hsl(${hue + 10}, ${saturation + 20}%, ${lightness - 10}%) 70%,
                hsl(${hue + 20}, ${saturation + 10}%, ${Math.max(5, lightness - 20)}%) 100%
            )
        `;

        // Update sun glare opacity
        document.getElementById('sunGlare').style.opacity = 1 - progress;

        // Update vignette intensity
        document.getElementById('vignette').style.boxShadow =
            `inset 0 0 ${150 + progress * 100}px rgba(0, 0, 0, ${0.5 + progress * 0.3})`;

        // Update section visibility - smooth fade based on distance
        const sections = document.querySelectorAll('.depth-section');
        sections.forEach(section => {
            const sectionDepth = parseInt(section.dataset.depth);
            const depthDiff = Math.abs(this.depth - sectionDepth);

            let opacity;
            if (sectionDepth === 60) {
                // Booking form: special handling - fade in from 42m, reach full at 52m, stay there
                // This ensures smooth transition from gallery (40m) to booking
                if (this.depth >= 52) {
                    opacity = 1;
                } else if (this.depth >= 42) {
                    // Fade in over 10m (42-52)
                    opacity = (this.depth - 42) / 10;
                } else {
                    opacity = 0;
                }
            } else if (sectionDepth === 40) {
                // Gallery: fade out more gradually to overlap with booking form
                if (this.depth <= 40) {
                    opacity = Math.max(0, 1 - depthDiff / 15);
                } else {
                    // After passing gallery, fade out over 12m
                    opacity = Math.max(0, 1 - (this.depth - 40) / 12);
                }
            } else {
                // Other sections fade based on distance
                opacity = Math.max(0, 1 - depthDiff / 15);
            }

            section.style.opacity = opacity;
        });

        // Move content based on depth with sticky behavior
        const content = document.getElementById('depthContent');

        // Calculate transform with cap for bottom section
        // Booking section is at 5000px, section is 1000px tall
        // To center the form in viewport: section center (5500px) should align with viewport center
        const viewportHeight = window.innerHeight;
        const maxTransform = 5500 - viewportHeight / 2;
        const rawTransform = this.depth * 100;
        const clampedTransform = Math.min(rawTransform, maxTransform);

        content.style.transform = `translateY(-${clampedTransform}px)`;
    }

    handleBooking() {
        if (this.depth < 55) return;

        this.hasBooked = true;
        document.getElementById('successOverlay').classList.add('active');
    }

    createBubbles(x, y) {
        const container = document.getElementById('bubbles');
        const bubbleCount = 3 + Math.floor(Math.random() * 4); // 3-6 bubbles

        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';

            // Random size between 8-20px
            const size = 8 + Math.random() * 12;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;

            // Position with slight random offset
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 20;
            bubble.style.left = `${x + offsetX}px`;
            bubble.style.top = `${y + offsetY}px`;

            // Random animation delay for staggered effect
            bubble.style.animationDelay = `${i * 0.1}s`;

            container.appendChild(bubble);

            // Remove bubble after animation
            setTimeout(() => {
                bubble.remove();
            }, 3000 + i * 100);
        }
    }

    animate() {
        // Update targetDepth if holding
        if (this.isHolding && this.targetDepth < this.maxDepth) {
            this.targetDepth += 0.015; // ~1m per second at 60fps

            // Update breath timer
            this.holdDuration = (Date.now() - this.holdStartTime) / 1000;
            const mins = Math.floor(this.holdDuration / 60);
            const secs = Math.floor(this.holdDuration % 60);
            document.getElementById('breathTimer').textContent =
                `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        // Smoothly lerp depth towards target (this creates the smooth flow)
        const lerpSpeed = 0.03; // Lower = smoother/slower
        this.depth += (this.targetDepth - this.depth) * lerpSpeed;
        this.updateDepth();

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ApneaDescender();
});
