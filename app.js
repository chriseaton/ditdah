document.addEventListener('DOMContentLoaded', () => new DitDah(), false);

class DitDah {
    constructor() {

        /**
         * @type {AudioContext}
         */
        this.audioContext = new AudioContext();

        /**
         * @type {GainNode}
         */
        this.volume = new GainNode(this.audioContext);

        /**
         * @type {StereoPannerNode}
         */
        this.panner = new StereoPannerNode(this.audioContext);

        /**
         * @type {AnalyserNode}
         */
        this.analyser = new AnalyserNode(this.audioContext, {
            fftSize: 2048
        });

        /**
         * @type {CanvasRenderingContext2D}
         */
        this.spectrolizerContext = null;

        /**
         * Active settings to apply for nodes.
         */
        this.settings = {
            spectrolizer: {
                data: new Uint8Array(this.analyser.frequencyBinCount),
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
            ditButton: document.querySelector('#dit-button'),
            dahButton: document.querySelector('#dah-button'),
            spectrolizerCanvas: document.getElementById('spectrolizer-canvas'),
            //settings
            volumeRange: document.querySelector('#volume-range'),
            pannerRange: document.querySelector('#panner-range'),
            //dit settings
            ditFrequencyRange: document.querySelector('#dit-frequency-range'),
            ditWaveformSelect: document.querySelector('#dit-waveform-select'),
            ditDurationRange: document.querySelector('#dit-duration-range'),
            //dah settings
            dahFrequencyRange: document.querySelector('#dah-frequency-range'),
            dahWaveformSelect: document.querySelector('#dah-waveform-select'),
            dahDurationRange: document.querySelector('#dah-duration-range'),
        };

        //init
        this.initAudio();
        this.initSpectrolizer();
        this.listen();
        window.dit = this.dit.bind(this);
        window.dah = this.dah.bind(this);
    }

    initAudio() {
        this.analyser.getByteTimeDomainData(this.settings.spectrolizer.data);
        this.volume
            .connect(this.panner)
            .connect(this.analyser)
            .connect(this.audioContext.destination);
        this.controls.ditDurationRange.value = this.settings.dit.duration;
        this.controls.ditFrequencyRange.value = this.settings.dit.frequency;
        this.controls.ditWaveformSelect.value = this.settings.dit.waveform;
        this.controls.dahDurationRange.value = this.settings.dah.duration;
        this.controls.dahFrequencyRange.value = this.settings.dah.frequency;
        this.controls.dahWaveformSelect.value = this.settings.dah.waveform;
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

    resize() {
        this.settings.spectrolizer.width = window.innerWidth;
        this.settings.spectrolizer.height = window.innerHeight;
        this.controls.spectrolizerCanvas.width = window.innerWidth;
        this.controls.spectrolizerCanvas.height = window.innerHeight;
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
                console.log(`set ${key} to `, value);
            } else {
                setting = setting[keySegments[i]];
            }
        }
        this.updateNodes();
    }

    /**
     * Update the active audio nodes.
     */
    updateNodes() {
        this.volume.gain.value = this.settings.gain;
        this.panner.pan.value = this.settings.pan;
    }

    dit() {
        let { duration, frequency, waveform } = this.settings.dit;
        this.tone(duration, frequency, waveform);
    }

    dah() {
        let { duration, frequency, waveform } = this.settings.dah;
        this.tone(duration, frequency, waveform);
    }

    keytone(up) {
        //TODO
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
        s.connect(g).connect(this.volume);
        let now = this.audioContext.currentTime;
        g.gain.setValueAtTime(1, now);
        s.start();
        s.stop(now + duration);
        g.gain.setValueAtTime(1, now + duration - 0.05);
        g.gain.linearRampToValueAtTime(0, now + duration);
    }

    draw() {
        requestAnimationFrame(this.draw.bind(this));
        this.analyser.getByteTimeDomainData(this.settings.spectrolizer.data);
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
        const sliceWidth = state.width * 1.0 / this.analyser.frequencyBinCount;
        let x = 0;
        for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
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