document.addEventListener('DOMContentLoaded', () => new DitDah(), false);

class DitDah {
    constructor() {

        /**
         * @type {AudioContext}
         */
        this.audioContext = new AudioContext();

        this.nodes = {
            /**
             * @type {GainNode}
             */
            volume: new GainNode(this.audioContext),
            /**
             * @type {StereoPannerNode}
             */
            panner: new StereoPannerNode(this.audioContext),
            /**
             * @type {AnalyserNode}
             */
            analyser: new AnalyserNode(this.audioContext, {
                fftSize: 2048
            }),
            keytone: {
                /**
                 * @type {String}
                 */
                status: 'off',
                /**
                 * @type {OscillatorNode}
                 */
                oscillator: null,
                /**
                 * @type {GainNode}
                 */
                gain: null
            },
            static: {
                //static noise
            },
            pink: {
                //pink noise
            }
        }

        /**
         * @type {CanvasRenderingContext2D}
         */
        this.spectrolizerContext = null;

        /**
         * Active settings to apply for nodes.
         */
        this.settings = {
            link: true,
            ridiculous: false,
            letterBreak: 0.2,
            wordBreak: 1,
            spectrolizer: {
                data: new Uint8Array(this.nodes.analyser.frequencyBinCount),
                width: window.innerWidth,
                height: window.innerHeight
            },
            gain: 1,
            pan: 0,
            dit: {
                frequency: 641,
                waveform: 'sine',
                duration: 0.15
            },
            dah: {
                frequency: 641,
                waveform: 'sine',
                duration: 0.45
            },
        };

        this.controls = {
            ditButton: document.querySelector('#dit'),
            dahButton: document.querySelector('#dah'),
            spectrolizerCanvas: document.querySelector('#spectrolizer'),
            //settings
            volumeRange: document.querySelector('#volume'),
            pannerRange: document.querySelector('#panner'),
            letterBreakRange: document.querySelector('#letter-break'),
            wordBreakRange: document.querySelector('#word-break'),
            linkDitDahCheckbox: document.querySelector('#link-ditdah'),
            ridiculousCheckbox: document.querySelector('#ridiculous-hz'),
            //dit settings
            ditFrequencyRange: document.querySelector('#dit-frequency'),
            ditWaveformSelect: document.querySelector('#dit-waveform'),
            ditDurationRange: document.querySelector('#dit-duration'),
            //dah settings
            dahFrequencyRange: document.querySelector('#dah-frequency'),
            dahWaveformSelect: document.querySelector('#dah-waveform'),
            dahDurationRange: document.querySelector('#dah-duration'),
        };

        //init
        this.initAudio();
        this.initSpectrolizer();
        this.listen();
        this.update();
        window.dit = this.dit.bind(this);
        window.dah = this.dah.bind(this);
    }

    initAudio() {
        this.nodes.analyser.getByteTimeDomainData(this.settings.spectrolizer.data);
        this.nodes.volume
            .connect(this.nodes.panner)
            .connect(this.nodes.analyser)
            .connect(this.audioContext.destination);
        this.controls.ditDurationRange.value = this.settings.dit.duration;
        this.controls.ditFrequencyRange.value = this.settings.dit.frequency;
        this.controls.ditWaveformSelect.value = this.settings.dit.waveform;
        this.controls.dahDurationRange.value = this.settings.dah.duration;
        this.controls.dahFrequencyRange.value = this.settings.dah.frequency;
        this.controls.dahWaveformSelect.value = this.settings.dah.waveform;
        this.controls.linkDitDahCheckbox.checked = this.settings.link;
        this.controls.ridiculousCheckbox.checked = this.settings.ridiculous;
    }

    initSpectrolizer() {
        this.controls.spectrolizerCanvas.width = this.settings.spectrolizer.width;
        this.controls.spectrolizerCanvas.height = this.settings.spectrolizer.height;
        this.spectrolizerContext = this.controls.spectrolizerCanvas.getContext('2d', { alpha: false });
        this.spectrolizerContext.imageSmoothingEnabled = true;
        this.spectrolizerContext.translate(0.5, 0.5);
        this.draw();
    }

    /**
     * Listen for user interface changes.
     */
    listen() {
        //actions
        this.controls.ditButton.addEventListener('click', () => this.dit(), false);
        this.controls.dahButton.addEventListener('click', () => this.dah(), false);
        window.addEventListener('resize', () => this.resize(), false);
        window.addEventListener('keydown', (e) => this.keytoneToggle('keydown', e), false);
        window.addEventListener('keyup', (e) => this.keytoneToggle('keyup', e), false);
        this.controls.linkDitDahCheckbox.addEventListener('change', (e) => this.changeSetting('link', e.target.checked), false);
        this.controls.ridiculousCheckbox.addEventListener('change', (e) => this.changeSetting('ridiculous', e.target.checked), false);
        //settings
        this.controls.volumeRange.addEventListener('input', (e) => this.changeSetting('gain', parseFloat(e.target.value)), false);
        this.controls.pannerRange.addEventListener('input', (e) => this.changeSetting('pan', parseFloat(e.target.value)), false);
        //dit settings
        this.controls.ditDurationRange.addEventListener('input', (e) => this.changeSetting('dit.duration', parseFloat(e.target.value)), false);
        this.controls.ditFrequencyRange.addEventListener('input', (e) => this.changeSetting('dit.frequency', parseInt(e.target.value)), false);
        this.controls.ditWaveformSelect.addEventListener('change', (e) => this.changeSetting('dit.waveform', e.target.value), false);
        //dah settings
        this.controls.dahDurationRange.addEventListener('input', (e) => this.changeSetting('dah.duration', parseFloat(e.target.value)), false);
        this.controls.dahFrequencyRange.addEventListener('input', (e) => this.changeSetting('dah.frequency', parseInt(e.target.value)), false);
        this.controls.dahWaveformSelect.addEventListener('change', (e) => this.changeSetting('dah.waveform', e.target.value), false);
    }

    /**
     * Handles when the window is resized and adjusts the UI to fit.
     */
    resize() {
        this.settings.spectrolizer.width = window.innerWidth;
        this.settings.spectrolizer.height = window.innerHeight;
        this.controls.spectrolizerCanvas.width = window.innerWidth;
        this.controls.spectrolizerCanvas.height = window.innerHeight;
    }

    /**
     * Handles a keytone toggling event.
     */
    keytoneToggle(eventName, e) {
        if (!e.shiftKey && !e.ctrlKey && !e.altKey && e.key === 'd') {
            this.keytone(eventName === 'keydown');
        }
    }

    /**
     * Update a settings value and trigger an update to audio.
     * @param {String} key 
     * @param {*} value 
     */
    changeSetting(key, value) {
        let keySegments = key.split('.');
        let setting = this.settings;
        for (let i = 0; i < keySegments.length; i++) {
            if (i === keySegments.length - 1) {
                setting[keySegments[i]] = value;
            } else {
                setting = setting[keySegments[i]];
            }
        }
        this.update();
    }

    /**
     * Update the active audio nodes and controls based on settings changes.
     */
    update() {
        this.nodes.volume.gain.value = this.settings.gain;
        this.nodes.panner.pan.value = this.settings.pan;
        if (this.settings.link) {
            this.settings.dah.duration = this.controls.ditDurationRange.value * 3;
            this.settings.dah.frequency = this.controls.ditFrequencyRange.value;
            this.settings.dah.waveform = this.controls.ditWaveformSelect.value;
            this.controls.dahDurationRange.value = this.settings.dah.duration;
            this.controls.dahFrequencyRange.value = this.settings.dah.frequency;
            this.controls.dahWaveformSelect.value = this.settings.dah.waveform;
        }
        if (this.settings.ridiculous) {
            this.controls.ditFrequencyRange.min = 30;
            this.controls.ditFrequencyRange.max = 15000;
            this.controls.dahFrequencyRange.min = 30;
            this.controls.dahFrequencyRange.max = 15000;
        } else {
            this.controls.ditFrequencyRange.min = 100;
            this.controls.dahFrequencyRange.min = 100;
            this.controls.ditFrequencyRange.max = 4000;
            this.controls.dahFrequencyRange.max = 4000;
            this.settings.dit.frequency = Math.min(Math.max(this.settings.dit.frequency, 100), 4000);
            this.settings.dah.frequency = Math.min(Math.max(this.settings.dah.frequency, 100), 4000);
        }
        if (this.nodes.keytone.status === 'on') {
            this.nodes.keytone.oscillator.frequency.value = this.settings.dit.frequency;
            this.nodes.keytone.oscillator.type = this.settings.dit.waveform;
        }
        //update labels
        document.querySelector('label[for="volume"]').innerHTML = `Volume, ${(this.settings.gain * 100).toFixed(0)}%`
        if (this.settings.pan < 0) {
            document.querySelector('label[for="panner"]').innerHTML = `Panner, Left ${(this.settings.pan * -100).toFixed(0)}%`
        } else if (this.settings.pan > 0) {
            document.querySelector('label[for="panner"]').innerHTML = `Panner, Right ${(this.settings.pan * 100).toFixed(0)}%`
        } else {
            document.querySelector('label[for="panner"]').innerHTML = `Panner, Balanced`
        }
        document.querySelector('label[for="letter-duration"]').innerHTML = `Letter Break, ${(this.settings.gain * 100).toFixed(0)}%`
    }

    dit() {
        let { duration, frequency, waveform } = this.settings.dit;
        this.tone(duration, frequency, waveform);
    }

    dah() {
        let { duration, frequency, waveform } = this.settings.dah;
        this.tone(duration, frequency, waveform);
    }

    keytone(on) {
        if (on && this.nodes.keytone.status === 'off') {
            //start the keytone
            let s = new OscillatorNode(this.audioContext, {
                frequency: this.settings.dit.frequency,
                type: this.settings.dit.waveform
            });
            let g = new GainNode(this.audioContext);
            this.nodes.keytone.oscillator = s;
            this.nodes.keytone.gain = g;
            //connect and start
            s.connect(g).connect(this.nodes.volume);
            s.start();
            this.nodes.keytone.status = 'on';
        } else if (!on && this.nodes.keytone.status === 'on') {
            //fadeout and stop the keytone.
            let now = this.audioContext.currentTime;
            let g = this.nodes.keytone.gain;
            g.gain.linearRampToValueAtTime(0, now + 0.05);
            this.nodes.keytone.oscillator.stop(now + 0.05);
            this.nodes.keytone.status = 'queued';
            setTimeout(() => {
                this.nodes.keytone.status = 'off';
            }, 0.05);
        }
    }

    /**
     * Play a tone for a specific duration, at a given frequency, using the specified waveform.
     * @param {Number} duration 
     * @param {Number} frequency 
     * @param {String} waveform 
     */
    tone(duration, frequency, waveform) {
        let s = new OscillatorNode(this.audioContext, {
            frequency: frequency,
            type: waveform
        });
        let g = new GainNode(this.audioContext);
        s.connect(g).connect(this.nodes.volume);
        let now = this.audioContext.currentTime;
        g.gain.setValueAtTime(1, now);
        s.start();
        s.stop(now + duration);
        g.gain.setValueAtTime(1, now + duration - 0.05);
        g.gain.linearRampToValueAtTime(0, now + duration);
    }

    draw() {
        requestAnimationFrame(this.draw.bind(this));
        this.nodes.analyser.getByteTimeDomainData(this.settings.spectrolizer.data);
        let context = this.spectrolizerContext;
        let state = {
            width: this.settings.spectrolizer.width,
            height: this.settings.spectrolizer.height,
        };
        //draw
        context.fillStyle = '#A5D1EB';
        context.fillRect(0, 0, state.width, state.height);
        for (let x = 0; x < state.width; x += 32) {
            this.drawLine(context, state, 1, '#73AB8D', x, 0, x, state.height);
        }
        for (let y = 0; y < state.height; y += 32) {
            this.drawLine(context, state, 1, '#73AB8D', 0, y, state.width, y);
        }
        this.drawFreq(context, state, 4, '#9AA1A6');
    }

    drawLine(context, state, width, color, x, y, x2, y2) {
        context.lineWidth = width;
        context.strokeStyle = color;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x2, y2);
        context.stroke();
    }

    drawFreq(context, state, width, color) {
        context.lineWidth = width;
        context.strokeStyle = color;
        context.beginPath();
        const sliceWidth = state.width * 1.0 / this.nodes.analyser.frequencyBinCount;
        let x = 0;
        for (let i = 0; i < this.nodes.analyser.frequencyBinCount; i++) {
            const v = this.settings.spectrolizer.data[i] / 128.0;
            const y = v * state.height / 2;
            if (i === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
            x += sliceWidth;
        }
        context.lineTo(state.width, state.height / 2);
        context.stroke();
    }

}