// Oyun Durumu
class GameState {
    constructor() {
        this.currentThemeIndex = 0;
        this.currentQuestionIndex = 0;
        this.gameData = null;
        this.completedThemes = [];
        this.playerPosition = { x: 0, y: 0 };
        this.isLoading = true;
        this.lastSaveTime = null;
    }

    // Oyun durumunu localStorage'a kaydet
    saveGame() {
        const saveData = {
            currentThemeIndex: this.currentThemeIndex,
            currentQuestionIndex: this.currentQuestionIndex,
            completedThemes: this.completedThemes,
            lastSaveTime: new Date().toISOString()
        };
        
        try {
            localStorage.setItem('istanbulMacerasi_save', JSON.stringify(saveData));
            console.log('Oyun kaydedildi:', saveData);
        } catch (error) {
            console.error('Oyun kaydedilemedi:', error);
        }
    }

    // Oyun durumunu localStorage'dan yükle
    loadGame() {
        try {
            const saveData = localStorage.getItem('istanbulMacerasi_save');
            if (saveData) {
                const data = JSON.parse(saveData);
                this.currentThemeIndex = data.currentThemeIndex || 0;
                this.currentQuestionIndex = data.currentQuestionIndex || 0;
                this.completedThemes = data.completedThemes || [];
                this.lastSaveTime = data.lastSaveTime;
                console.log('Oyun yüklendi:', data);
                return true;
            }
        } catch (error) {
            console.error('Oyun yüklenemedi:', error);
        }
        return false;
    }

    // Kayıt var mı kontrol et
    hasSaveGame() {
        return localStorage.getItem('istanbulMacerasi_save') !== null;
    }

    // Kayıt bilgilerini getir
    getSaveInfo() {
        if (!this.hasSaveGame()) return null;
        
        try {
            const saveData = JSON.parse(localStorage.getItem('istanbulMacerasi_save'));
            return {
                currentThemeIndex: saveData.currentThemeIndex,
                completedThemes: saveData.completedThemes,
                lastSaveTime: saveData.lastSaveTime
            };
        } catch (error) {
            return null;
        }
    }
}

// Oyun Yöneticisi
class GameManager {
    constructor() {
        this.state = new GameState();
        this.screens = {
            start: document.getElementById('startScreen'),
            theme: document.getElementById('themeScreen'),
            reward: document.getElementById('rewardScreen'),
            map: document.getElementById('mapScreen'),
            final: document.getElementById('finalScreen'),
            kavusmaIntro: document.getElementById('kavusmaIntroScreen'),
            kavusma: document.getElementById('kavusmaScreen'),
            heartGame: document.getElementById('heartGameScreen'),
            birthdayGame: document.getElementById('birthdayGameScreen'),
            loading: document.getElementById('loadingScreen')
        };
        this.init();
    }

    async init() {
        try {
            await this.loadGameData();
            this.setupEventListeners();
            this.checkSaveGame();
            this.showScreen('start');
            this.state.isLoading = false;
        } catch (error) {
            console.error('Oyun yüklenirken hata:', error);
            alert('Oyun yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        }
    }

    async loadGameData() {
        try {
            const response = await fetch('data.json');
            this.state.gameData = await response.json();
        } catch (error) {
            throw new Error('data.json dosyası yüklenemedi');
        }
    }

    setupEventListeners() {
        // Yeni oyun butonu
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.startNewGame();
        });

        // Kaldığın yerden devam et butonu
        document.getElementById('continueGameBtn').addEventListener('click', () => {
            this.continueGame();
        });

        // Seçenek butonları
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleAnswer(parseInt(e.target.dataset.index));
            });
        });

        // Devam et butonu
        document.getElementById('continueBtn').addEventListener('click', () => {
            this.showMapScreen();
        });

        // Tema başlat butonu
        document.getElementById('startThemeBtn').addEventListener('click', () => {
            this.startTheme();
        });

        // Tema menüsü açma butonu
        document.getElementById('openThemeMenuBtn').addEventListener('click', () => {
            this.openThemeMenu();
        });

        // Tema menüsü kapatma butonu
        document.getElementById('closeThemeMenuBtn').addEventListener('click', () => {
            this.closeThemeMenu();
        });

        // Kavuştuk butonu
        document.getElementById('kavusmaBtn').addEventListener('click', () => {
            this.showKavusmaScreen();
        });

        // Kavuşma giriş ekranı butonu
        document.getElementById('showKavusmaBtn').addEventListener('click', () => {
            this.showKavusmaScreen();
        });

        // Kavuşma kartı tıklama
        document.getElementById('kavusmaCard').addEventListener('click', () => {
            this.flipKavusmaCard();
        });

        // Açık uçlu soru input event listener'ları
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            // Enter tuşu ile cevap gönderme
            answerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAnswer(null); // Açık uçlu sorular için index gerekmez
                }
            });

            // Input değişikliklerini dinle
            answerInput.addEventListener('input', (e) => {
                const answer = e.target.value.trim();
                const submitBtn = document.getElementById('submitAnswerBtn');
                if (submitBtn) {
                    submitBtn.disabled = answer === '';
                }
                
                // Yazılan cevabı anlık olarak göster
                this.updateAnswerPreview(answer);
            });
        }

        // Açık uçlu soru gönderme butonu
        const submitAnswerBtn = document.getElementById('submitAnswerBtn');
        if (submitAnswerBtn) {
            submitAnswerBtn.addEventListener('click', () => {
                this.handleAnswer(null); // Açık uçlu sorular için index gerekmez
            });
        }

        // Harita zoom kontrolleri
        this.setupMapControls();
    }

    setupMapControls() {
        const mapWrapper = document.getElementById('mapWrapper');
        const mapImage = document.getElementById('mapImage');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetZoomBtn = document.getElementById('resetZoomBtn');

        // Global değişkenler olarak tanımla
        this.currentZoom = 1;
        this.translateX = 0;
        this.translateY = 0;
        let isDragging = false;
        let startX, startY;

        // Zoom butonları
        zoomInBtn.addEventListener('click', () => {
            this.currentZoom = Math.min(this.currentZoom * 1.2, 3);
            updateMapTransform();
        });

        zoomOutBtn.addEventListener('click', () => {
            this.currentZoom = Math.max(this.currentZoom / 1.2, 0.5);
            updateMapTransform();
        });

        resetZoomBtn.addEventListener('click', () => {
            this.currentZoom = 1;
            this.translateX = 0;
            this.translateY = 0;
            updateMapTransform();
        });

        // Mouse wheel zoom
        mapWrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.currentZoom = Math.max(0.5, Math.min(3, this.currentZoom * delta));
            updateMapTransform();
        });

        // Mouse drag
        mapWrapper.addEventListener('mousedown', (e) => {
            if (e.target === mapImage) {
                isDragging = true;
                startX = e.clientX - this.translateX;
                startY = e.clientY - this.translateY;
                mapWrapper.style.cursor = 'grabbing';
            }
        });

        mapWrapper.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.translateX = e.clientX - startX;
                this.translateY = e.clientY - startY;
                updateMapTransform();
            }
        });

        mapWrapper.addEventListener('mouseup', () => {
            isDragging = false;
            mapWrapper.style.cursor = 'grab';
        });

        mapWrapper.addEventListener('mouseleave', () => {
            isDragging = false;
            mapWrapper.style.cursor = 'grab';
        });

        // Touch events for mobile
        mapWrapper.addEventListener('touchstart', (e) => {
            if (e.target === mapImage && e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX - this.translateX;
                startY = e.touches[0].clientY - this.translateY;
            }
        });

        mapWrapper.addEventListener('touchmove', (e) => {
            if (isDragging && e.touches.length === 1) {
                e.preventDefault();
                this.translateX = e.touches[0].clientX - startX;
                this.translateY = e.touches[0].clientY - startY;
                updateMapTransform();
            }
        });

        mapWrapper.addEventListener('touchend', () => {
            isDragging = false;
        });

        // Pinch zoom for mobile
        let initialDistance = 0;
        let initialZoom = 1;

        mapWrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialZoom = this.currentZoom;
            }
        });

        mapWrapper.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const scale = currentDistance / initialDistance;
                this.currentZoom = Math.max(0.5, Math.min(3, initialZoom * scale));
                updateMapTransform();
            }
        });

        const self = this;
        function updateMapTransform() {
            // Harita sınırlarını hesapla
            const mapWrapper = document.getElementById('mapWrapper');
            const mapImage = document.getElementById('mapImage');
            const wrapperRect = mapWrapper.getBoundingClientRect();
            
            // Maksimum hareket sınırları
            const maxTranslateX = (wrapperRect.width * (self.currentZoom - 1)) / 2;
            const maxTranslateY = (wrapperRect.height * (self.currentZoom - 1)) / 2;
            
            // Sınırları uygula
            self.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, self.translateX));
            self.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, self.translateY));
            
            mapImage.style.transform = `translate(${self.translateX}px, ${self.translateY}px) scale(${self.currentZoom})`;
            
            // Oyuncu pozisyonu güncelleme devre dışı (simge gizlendi)
            // self.updatePlayerPositionWithTransform();
        }
    }



    checkSaveGame() {
        if (this.state.hasSaveGame()) {
            const saveInfo = this.state.getSaveInfo();
            if (saveInfo) {
                // Kayıt bilgilerini göster
                document.getElementById('continueGameBtn').style.display = 'block';
                document.getElementById('saveInfo').style.display = 'block';
                
                // Son kaldığı yeri göster
                const currentTheme = this.state.gameData.themes[saveInfo.currentThemeIndex];
                const themeName = currentTheme ? currentTheme.name : 'Bilinmeyen Tema';
                document.getElementById('lastLocation').textContent = themeName;
                document.getElementById('completedCount').textContent = `${saveInfo.completedThemes.length} tema`;
                
                console.log('Kayıt bulundu:', saveInfo);
            }
        }
    }

    startNewGame() {
        // Mevcut kaydı sil
        localStorage.removeItem('istanbulMacerasi_save');
        
        // Oyunu sıfırla - gameData'yı koru
        const currentGameData = this.state.gameData;
        this.state = new GameState();
        this.state.gameData = currentGameData; // Mevcut veriyi koru
        
        // Başlangıç ekranını güncelle
        this.checkSaveGame();
        
        // Oyunu başlat
        this.startGame();
    }

    continueGame() {
        // Kayıtlı oyunu yükle
        if (this.state.loadGame()) {
            console.log('Kayıtlı oyun yüklendi, harita ekranına geçiliyor');
            this.showMapScreen();
        } else {
            console.log('Kayıt yüklenemedi, yeni oyun başlatılıyor');
            this.startNewGame();
        }
    }

    startGame() {
        this.state.currentThemeIndex = 0;
        this.state.currentQuestionIndex = 0;
        this.state.completedThemes = [];
        this.showMapScreen();
    }

    showMapScreen() {
        console.log(`showMapScreen çağrıldı - Tema indeksi: ${this.state.currentThemeIndex}`);
        console.log(`Toplam tema sayısı: ${this.state.gameData.themes.length}`);
        console.log(`Maps array uzunluğu: ${this.state.gameData.maps.length}`);
        
        // Tema indeksini kontrol et - 6. temadan sonra da harita ekranına geçsin
        if (this.state.currentThemeIndex >= this.state.gameData.themes.length) {
            console.log('Tüm temalar tamamlandı, final ekranına geçiliyor');
            this.showFinalScreen();
            return;
        }

        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        console.log(`Gösterilen tema: ${currentTheme.name}`);
        
        // Harita güncelleme sistemi - maps array'inin sınırlarını kontrol et
        let mapImage;
        
        // Eğer son tema tamamlandıysa map7.png göster
        if (this.state.currentThemeIndex === this.state.gameData.themes.length - 1) {
            mapImage = this.state.gameData.maps[6]; // map7.png
            console.log(`Son tema için map7.png gösteriliyor: ${mapImage}`);
        } else {
            const mapIndex = this.state.currentThemeIndex;
            console.log(`Map index: ${mapIndex}`);
            
            if (mapIndex < this.state.gameData.maps.length) {
                mapImage = this.state.gameData.maps[mapIndex];
                console.log(`Seçilen harita: ${mapImage}`);
            } else {
                // Eğer maps array'inde yeterli harita yoksa varsayılan haritayı kullan
                mapImage = this.state.gameData.mapImage;
                console.log(`Varsayılan harita kullanılıyor: ${mapImage}`);
            }
        }
        
        // Harita ve oyuncu ikonunu yükle
        try {
            document.getElementById('mapImage').src = mapImage;
            document.getElementById('playerIcon').src = this.state.gameData.playerIcon;
        } catch (error) {
            console.error('Harita yüklenirken hata:', error);
            // Hata durumunda varsayılan haritayı kullan
            document.getElementById('mapImage').src = this.state.gameData.mapImage;
        }

        // Oyuncu pozisyonu güncelleme devre dışı (simge gizlendi)
        // this.updatePlayerPosition();

        // Sonraki tema bilgilerini göster
        document.getElementById('nextThemeName').textContent = currentTheme.name;
        
        let themeDescription;
        if (currentTheme.type === 'heart_game') {
            themeDescription = '💕 Kalp Oyunu - Fotoğrafı keşfet!';
        } else if (currentTheme.type === 'birthday_game') {
            themeDescription = '🎂 Doğum Günü Oyunu - Eğlenceli soru!';
        } else if (currentTheme.questions && currentTheme.questions.length > 0) {
            themeDescription = `${currentTheme.questions.length} soru ile ${currentTheme.name} temasını keşfet!`;
        } else {
            themeDescription = `${currentTheme.name} temasını keşfet!`;
        }
        
        document.getElementById('nextThemeDescription').textContent = themeDescription;

        this.showScreen('map');
    }

    openThemeMenu() {
        this.createThemeGrid();
        document.getElementById('themeSelectionMenu').style.display = 'block';
    }

    closeThemeMenu() {
        document.getElementById('themeSelectionMenu').style.display = 'none';
    }

    createThemeGrid() {
        const themeGrid = document.getElementById('themeGrid');
        themeGrid.innerHTML = '';

        this.state.gameData.themes.forEach((theme, index) => {
            const themeCard = document.createElement('div');
            themeCard.className = 'theme-card';
            
            // Tema durumunu belirle
            const isCompleted = this.state.completedThemes.some(t => t.name === theme.name);
            const isCurrent = index === this.state.currentThemeIndex;
            const isLocked = index > this.state.currentThemeIndex;
            
            if (isCompleted) {
                themeCard.classList.add('completed');
            } else if (isCurrent) {
                themeCard.classList.add('current');
            } else if (isLocked) {
                themeCard.classList.add('locked');
            }

            // Tema bilgilerini ekle
            const themeName = document.createElement('h5');
            themeName.textContent = theme.name;
            
            const themeDescription = document.createElement('p');
            if (theme.type === 'heart_game') {
                themeDescription.textContent = '💕 Kalp Oyunu - Fotoğrafı keşfet!';
            } else {
                themeDescription.textContent = `${theme.questions.length} soru ile ${theme.name} temasını keşfet!`;
            }
            
            const themeStatus = document.createElement('div');
            themeStatus.className = 'theme-status';
            
            if (isCompleted) {
                themeStatus.textContent = '✅ Tamamlandı';
            } else if (isCurrent) {
                themeStatus.textContent = '🎯 Mevcut Tema';
            } else if (isLocked) {
                themeStatus.textContent = '🔒 Kilitli';
            } else {
                themeStatus.textContent = '📚 Mevcut';
            }

            // Kartı oluştur
            themeCard.appendChild(themeName);
            themeCard.appendChild(themeDescription);
            themeCard.appendChild(themeStatus);
            
            // Tıklama olayı ekle
            themeCard.addEventListener('click', () => {
                if (isCompleted || isCurrent || !isLocked) {
                    this.selectTheme(index);
                }
            });
            
            themeGrid.appendChild(themeCard);
        });
    }

    selectTheme(themeIndex) {
        // Seçilen temaya geç
        this.state.currentThemeIndex = themeIndex;
        this.state.currentQuestionIndex = 0;
        
        // Tema menüsünü kapat
        this.closeThemeMenu();
        
        // Harita ekranını güncelle
        this.showMapScreen();
        
        // Oyunu kaydet
        this.state.saveGame();
    }

    updatePlayerPosition() {
        const playerMarker = document.getElementById('playerMarker');
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        // Oyuncu pozisyonunu sabit koordinatlarda tut
        playerMarker.style.left = `${currentTheme.mapPosition.x}px`;
        playerMarker.style.top = `${currentTheme.mapPosition.y}px`;
        playerMarker.style.transform = 'translate(-50%, -50%)';
    }

    updatePlayerPositionWithTransform() {
        const playerMarker = document.getElementById('playerMarker');
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        // Oyuncu pozisyonunu harita transformasyonuna göre hesapla
        const playerX = currentTheme.mapPosition.x;
        const playerY = currentTheme.mapPosition.y;
        
        // Harita transformasyonunu uygula
        const adjustedX = (playerX * this.currentZoom) + this.translateX;
        const adjustedY = (playerY * this.currentZoom) + this.translateY;
        
        playerMarker.style.left = `${adjustedX}px`;
        playerMarker.style.top = `${adjustedY}px`;
        playerMarker.style.transform = `translate(-50%, -50%) scale(${1/this.currentZoom})`;
    }

    startTheme() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        // Kalp oyunu teması mı kontrol et
        if (currentTheme.type === 'heart_game') {
            this.startHeartGame();
            return;
        }
        
        // Doğum günü oyunu teması mı kontrol et
        if (currentTheme.type === 'birthday_game') {
            this.startBirthdayGame();
            return;
        }
        
        // Tema ekranının arka planını ayarla
        document.getElementById('themeScreen').style.backgroundImage = 
            `url(${currentTheme.background})`;

        // Tema adını göster
        document.getElementById('themeName').textContent = currentTheme.name;

        // İlk soruyu göster
        this.showQuestion();
        
        // Tema başladığında oyunu kaydet
        this.state.saveGame();
        
        this.showScreen('theme');
    }

    showQuestion() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        const currentQuestion = currentTheme.questions[this.state.currentQuestionIndex];

        // Soru metnini güncelle
        document.getElementById('questionText').textContent = currentQuestion.question;

        // Açık uçlu soru mu kontrol et
        if (currentQuestion.type === 'open_ended') {
            this.showOpenEndedQuestion(currentQuestion);
        } else {
            this.showMultipleChoiceQuestion(currentQuestion);
        }

        // İlerleme çubuğunu güncelle
        const progress = ((this.state.currentQuestionIndex + 1) / currentTheme.questions.length) * 100;
        document.querySelector('.progress-fill').style.width = `${progress}%`;

        // Soru sayacını güncelle
        document.getElementById('questionCounter').textContent = 
            `${this.state.currentQuestionIndex + 1} / ${currentTheme.questions.length}`;
    }

    showOpenEndedQuestion(question) {
        // Seçenek butonlarını gizle
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        // Açık uçlu soru alanını göster
        const openEndedContainer = document.getElementById('openEndedContainer');
        if (openEndedContainer) {
            openEndedContainer.style.display = 'block';
        }
        
        // Cevap önizleme alanını gizle
        this.hideAnswerPreview();
    }

    // Cevap önizleme alanını güncelle
    updateAnswerPreview(answer) {
        const answerPreview = document.getElementById('answerPreview');
        const answerText = document.getElementById('answerText');
        
        if (answerPreview && answerText) {
            if (answer && answer.length > 0) {
                answerText.textContent = answer;
                answerPreview.style.display = 'block';
            } else {
                this.hideAnswerPreview();
            }
        }
    }

    // Cevap önizleme alanını gizle
    hideAnswerPreview() {
        const answerPreview = document.getElementById('answerPreview');
        if (answerPreview) {
            answerPreview.style.display = 'none';
        }
    }

    showMultipleChoiceQuestion(question) {
        // Açık uçlu soru alanını gizle
        const openEndedContainer = document.getElementById('openEndedContainer');
        if (openEndedContainer) {
            openEndedContainer.style.display = 'none';
        }

        // Seçenek butonlarını göster ve güncelle
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach((btn, index) => {
            if (question.options[index]) {
                btn.style.display = 'block';
                btn.textContent = question.options[index];
                btn.className = 'option-btn'; // Reset classes
            } else {
                // Eğer bu index için seçenek yoksa butonu gizle
                btn.style.display = 'none';
            }
        });
    }

    handleAnswer(selectedIndex) {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        const currentQuestion = currentTheme.questions[this.state.currentQuestionIndex];
        
        let isCorrect;
        
        // Açık uçlu soru mu kontrol et
        if (currentQuestion.type === 'open_ended') {
            isCorrect = this.checkOpenEndedAnswer();
        } else {
            isCorrect = selectedIndex === currentQuestion.answer;
        }

        // Seçenek butonlarını devre dışı bırak
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.style.pointerEvents = 'none';
        });

        // Açık uçlu soru için input'u devre dışı bırak
        if (currentQuestion.type === 'open_ended') {
            const answerInput = document.getElementById('answerInput');
            if (answerInput) {
                answerInput.disabled = true;
            }
        }

        // Seçilen butonu işaretle (çoktan seçmeli sorular için)
        if (currentQuestion.type !== 'open_ended') {
            const selectedButton = document.querySelector(`[data-index="${selectedIndex}"]`);
            selectedButton.classList.add(isCorrect ? 'correct' : 'incorrect');
        }

        // Geri bildirim göster
        this.showFeedback(isCorrect);

        // 1.5 saniye sonra devam et
        setTimeout(() => {
            this.hideFeedback();
            
            if (isCorrect) {
                this.nextQuestion();
            } else {
                // Yanlış cevap - checkpoint sistemine göre yönlendir
                this.handleWrongAnswer();
            }
            
            // Her cevaptan sonra oyunu kaydet
            this.state.saveGame();
        }, 1500);
    }

    checkOpenEndedAnswer() {
        const answerInput = document.getElementById('answerInput');
        if (!answerInput) return false;
        
        const answer = answerInput.value.trim();
        
        // Boş cevap kontrolü
        if (answer === '') return false;
        
        // Kelime sayısı kontrolü - tek kelime olmalı
        const wordCount = answer.split(/\s+/).filter(word => word.length > 0).length;
        
        if (wordCount === 1) {
            return true; // Tek kelime - doğru
        } else {
            return false; // Birden fazla kelime - yanlış
        }
    }

    showFeedback(isCorrect) {
        const feedbackOverlay = document.getElementById('feedbackOverlay');
        const feedbackIcon = feedbackOverlay.querySelector('.feedback-icon');
        const feedbackText = document.getElementById('feedbackText');

        feedbackIcon.className = `feedback-icon ${isCorrect ? 'correct' : 'incorrect'}`;
        
        if (isCorrect) {
            feedbackText.textContent = 'Doğru!';
        } else {
            const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
            const checkpointQuestion = currentTheme.checkpointQuestion; // 3
            const currentQuestion = this.state.currentQuestionIndex; // 0-based
            
            if (currentQuestion < (checkpointQuestion - 1)) {
                feedbackText.textContent = 'Yanlış! En başa dönüyorsun...';
            } else if (currentQuestion === (checkpointQuestion - 1)) {
                feedbackText.textContent = 'Yanlış! En başa dönüyorsun...';
            } else {
                feedbackText.textContent = 'Yanlış! Checkpoint\'e dönüyorsun...';
            }
        }

        feedbackOverlay.style.display = 'flex';
    }

    hideFeedback() {
        document.getElementById('feedbackOverlay').style.display = 'none';
        
        // Seçenek butonlarını sıfırla
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.className = 'option-btn';
            btn.style.pointerEvents = 'auto';
        });

        // Açık uçlu soru input'unu sıfırla
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.value = '';
            answerInput.disabled = false;
        }
        
        // Cevap önizleme alanını gizle
        this.hideAnswerPreview();
    }

    nextQuestion() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        this.state.currentQuestionIndex++;
        
        if (this.state.currentQuestionIndex >= currentTheme.questions.length) {
            // Tema tamamlandı
            this.completeTheme();
        } else {
            // Sonraki soru
            this.showQuestion();
        }
    }

    handleWrongAnswer() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        const checkpointQuestion = currentTheme.checkpointQuestion; // 3 (1-based)
        const currentQuestion = this.state.currentQuestionIndex; // 0-based
        
        let newPosition;
        let reason;
        
        if (currentQuestion < (checkpointQuestion - 1)) {
            // 1-2. sorularda hata yapıldı - en başa dön
            newPosition = 0;
            reason = "1-2. sorularda hata - en başa dönüldü";
        } else if (currentQuestion === (checkpointQuestion - 1)) {
            // 3. soruda (checkpoint) hata yapıldı - en başa dön
            newPosition = 0;
            reason = "3. soruda (checkpoint) hata - en başa dönüldü";
        } else {
            // 4-5. sorularda hata yapıldı - checkpoint'e (3. soruya) dön
            newPosition = checkpointQuestion - 1; // 3. soruya (index 2)
            reason = "4-5. sorularda hata - checkpoint'e (3. soruya) dönüldü";
        }
        
        console.log(`Checkpoint Sistemi: ${reason}`);
        console.log(`Soru ${currentQuestion + 1}'den ${newPosition + 1}'e gidiliyor`);
        console.log(`Checkpoint: ${checkpointQuestion}, Mevcut: ${currentQuestion + 1}`);
        
        this.state.currentQuestionIndex = newPosition;
        this.showQuestion();
    }

    goToCheckpoint() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        this.state.currentQuestionIndex = currentTheme.checkpointQuestion - 1; // 0-based index
        this.showQuestion();
    }

    completeTheme() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        console.log(`Tema tamamlandı: ${currentTheme.name} (${this.state.currentThemeIndex + 1}/${this.state.gameData.themes.length})`);
        
        // Tema zaten tamamlanmış mı kontrol et
        const isAlreadyCompleted = this.state.completedThemes.some(t => t.name === currentTheme.name);
        
        if (!isAlreadyCompleted) {
            // Tamamlanan temayı kaydet
            this.state.completedThemes.push({
                name: currentTheme.name,
                rewardImage: currentTheme.rewardImage
            });
        }

        // Tema indeksini artır
        this.state.currentThemeIndex++;
        
        // Soru indeksini sıfırla
        this.state.currentQuestionIndex = 0;

        console.log(`Sonraki tema indeksi: ${this.state.currentThemeIndex}`);

        // Oyunu kaydet
        this.state.saveGame();

        // Eğer son tema ise final ekranına geç, değilse ödül ekranına
        if (this.state.currentThemeIndex >= this.state.gameData.themes.length) {
            console.log('Tüm temalar tamamlandı, final ekranına geçiliyor');
            this.showFinalScreen();
        } else {
            // Ödül ekranını göster
            this.showRewardScreen(currentTheme.rewardImage);
        }
    }

    startHeartGame() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        // Kalp oyunu ekranını göster
        this.showScreen('heartGame');
        
        // Kalpleri oluştur
        this.createHearts();
        
        // Tema başladığında oyunu kaydet
        this.state.saveGame();
    }

    createHearts() {
        const heartOverlay = document.getElementById('heartOverlay');
        const totalHearts = 80; // Kalp sayısını 80'e çıkardım
        let remainingHearts = totalHearts;
        
        // Mevcut kalpleri temizle
        heartOverlay.innerHTML = '';
        
        // Kalp sayacını güncelle
        document.getElementById('remainingHearts').textContent = remainingHearts;
        
        // Kalpleri daha iyi dağıtılmış şekilde oluştur
        for (let i = 0; i < totalHearts; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            heart.innerHTML = '💕';
            
            // Daha iyi dağılım için grid benzeri pozisyonlama
            const row = Math.floor(i / 10); // 10 sütun
            const col = i % 10;
            const baseX = (col * 10) + 5; // 0-100% arası 10 eşit parça
            const baseY = (row * 14.28) + 7.14; // 0-100% arası 7 eşit parça
            
            // Rastgele varyasyon ekle - daha geniş aralık
            const randomX = (Math.random() - 0.5) * 25; // ±12.5% varyasyon
            const randomY = (Math.random() - 0.5) * 25; // ±12.5% varyasyon
            
            // Rastgele boyut ekle
            const randomSize = (Math.random() * 0.8 + 0.8); // 0.8x - 1.6x arası
            
            heart.style.left = Math.max(-5, Math.min(105, baseX + randomX)) + '%';
            heart.style.top = Math.max(-5, Math.min(105, baseY + randomY)) + '%';
            heart.style.animationDelay = Math.random() * 2 + 's'; // Rastgele animasyon gecikmesi
            heart.style.transform = `scale(${randomSize})`;
            
            // Kalbe tıklama olayı ekle
            heart.addEventListener('click', (e) => {
                e.stopPropagation(); // Event'in fotoğrafa gitmesini engelle
                if (!heart.classList.contains('clicked')) {
                    this.removeRandomHearts(10);
                }
            });
            
            heartOverlay.appendChild(heart);
        }
        
        // Fotoğrafın tamamına tıklama olayı ekle
        const heartGameWrapper = document.querySelector('.heart-game-wrapper');
        heartGameWrapper.addEventListener('click', (e) => {
            // Eğer kalbe tıklanmadıysa (fotoğrafa tıklandıysa)
            if (e.target.className !== 'heart') {
                this.removeRandomHearts(10);
            }
        });
    }
    
    removeRandomHearts(count) {
        const hearts = document.querySelectorAll('.heart:not(.clicked)');
        const remainingHearts = hearts.length;
        
        if (remainingHearts <= 0) return;
        
        // Kaç kalp kaldığını kontrol et
        const heartsToRemove = Math.min(count, remainingHearts);
        
        // Rastgele kalpleri seç ve yok et
        const heartsArray = Array.from(hearts);
        for (let i = 0; i < heartsToRemove; i++) {
            if (heartsArray.length > 0) {
                const randomIndex = Math.floor(Math.random() * heartsArray.length);
                const heart = heartsArray.splice(randomIndex, 1)[0];
                heart.classList.add('clicked');
            }
        }
        
        // Kalan kalp sayısını güncelle
        const newRemainingHearts = remainingHearts - heartsToRemove;
        document.getElementById('remainingHearts').textContent = newRemainingHearts;
        
        // Tüm kalpler yok olduysa oyunu tamamla
        if (newRemainingHearts <= 0) {
            setTimeout(() => {
                this.completeHeartGame();
            }, 1000);
        }
    }

    completeHeartGame() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        console.log(`Kalp oyunu tamamlandı: ${currentTheme.name}`);
        
        // Tema zaten tamamlanmış mı kontrol et
        const isAlreadyCompleted = this.state.completedThemes.some(t => t.name === currentTheme.name);
        
        if (!isAlreadyCompleted) {
            // Tamamlanan temayı kaydet
            this.state.completedThemes.push({
                name: currentTheme.name,
                rewardImage: currentTheme.rewardImage
            });
        }

        // Tema indeksini artır
        this.state.currentThemeIndex++;
        
        // Soru indeksini sıfırla
        this.state.currentQuestionIndex = 0;

        console.log(`Sonraki tema indeksi: ${this.state.currentThemeIndex}`);

        // Oyunu kaydet
        this.state.saveGame();

        // Eğer son tema ise final ekranına geç, değilse ödül ekranına
        if (this.state.currentThemeIndex >= this.state.gameData.themes.length) {
            console.log('Tüm temalar tamamlandı, final ekranına geçiliyor');
            this.showFinalScreen();
        } else {
            // Ödül ekranını göster
            this.showRewardScreen(currentTheme.rewardImage);
        }
    }

    startBirthdayGame() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        // Doğum günü oyunu ekranını göster
        this.showScreen('birthdayGame');
        
        // Oyunu başlat
        this.initBirthdayGame();
        
        // Tema başladığında oyunu kaydet
        this.state.saveGame();
    }

    initBirthdayGame() {
        const yesButton = document.getElementById('yesButton');
        const noButton = document.getElementById('noButton');
        const birthdayMessage = document.getElementById('birthdayMessage');
        
        let noButtonScale = 1;
        let yesButtonScale = 1;
        let noButtonOpacity = 1;
        let clickCount = 0;
        
        // Hayır butonunun başlangıç pozisyonunu rastgele yap
        const maxX = window.innerWidth - 200;
        const maxY = window.innerHeight - 100;
        const startX = Math.random() * maxX;
        const startY = Math.random() * maxY;
        
        noButton.style.position = 'fixed';
        noButton.style.left = startX + 'px';
        noButton.style.top = startY + 'px';
        noButton.style.zIndex = '1000';
        
        // Evet butonuna tıklama
        yesButton.addEventListener('click', () => {
            this.completeBirthdayGame();
        });
        
        // Hayır butonuna tıklama
        noButton.addEventListener('click', () => {
            clickCount++;
            
            // Hayır butonu rastgele yere kaçsın
            const maxX = window.innerWidth - 200; // Buton genişliği
            const maxY = window.innerHeight - 100; // Buton yüksekliği
            
            const randomX = Math.random() * maxX;
            const randomY = Math.random() * maxY;
            
            // Hayır butonunu rastgele pozisyona taşı
            noButton.style.position = 'fixed';
            noButton.style.left = randomX + 'px';
            noButton.style.top = randomY + 'px';
            noButton.style.zIndex = '1000';
            
            // Hayır butonu küçülsün
            noButtonScale = Math.max(0.3, noButtonScale - 0.1);
            noButton.style.transform = `scale(${noButtonScale})`;
            
            // Evet butonu büyüsün
            yesButtonScale = Math.min(2.5, yesButtonScale + 0.2);
            yesButton.style.transform = `scale(${yesButtonScale})`;
            
            // Evet butonu çok büyükse boyutunu artır
            if (yesButtonScale >= 1.5) {
                yesButton.style.fontSize = '2.5rem';
                yesButton.style.padding = '2.5rem 5rem';
            }
            
            // Hayır butonu çok küçükse gizle
            if (noButtonScale <= 0.3) {
                noButton.style.display = 'none';
                // Evet butonuna odaklan
                yesButton.style.animation = 'pulse 0.5s infinite';
            }
            
            // Hızı artır (her tıklamada daha hızlı)
            if (clickCount > 3) {
                noButton.style.transition = 'all 0.1s ease';
                noButton.classList.add('escaping');
            }
        });
        
        // Mouse hover'da da hayır butonu kaçsın
        noButton.addEventListener('mouseenter', () => {
            if (noButtonScale > 0.3) {
                const maxX = window.innerWidth - 200;
                const maxY = window.innerHeight - 100;
                
                const randomX = Math.random() * maxX;
                const randomY = Math.random() * maxY;
                
                noButton.style.left = randomX + 'px';
                noButton.style.top = randomY + 'px';
            }
        });
    }

    completeBirthdayGame() {
        const currentTheme = this.state.gameData.themes[this.state.currentThemeIndex];
        
        console.log(`Doğum günü oyunu tamamlandı: ${currentTheme.name}`);
        
        // Ekrandaki diğer her şeyi gizle
        document.querySelector('.birthday-question').style.display = 'none';
        document.querySelector('.birthday-buttons').style.display = 'none';
        
        // Mesajı göster
        const birthdayMessage = document.getElementById('birthdayMessage');
        birthdayMessage.style.display = 'block';
        
        // Mesajı ekranın ortasına taşı
        birthdayMessage.style.position = 'absolute';
        birthdayMessage.style.top = '50%';
        birthdayMessage.style.left = '50%';
        birthdayMessage.style.transform = 'translate(-50%, -50%)';
        birthdayMessage.style.width = '100%';
        birthdayMessage.style.maxWidth = '600px';
        
        // Centered class'ını ekle
        birthdayMessage.classList.add('centered');
        
        // 3 saniye sonra tema tamamlanacak
        setTimeout(() => {
            try {
                // Tema zaten tamamlanmış mı kontrol et
                const isAlreadyCompleted = this.state.completedThemes.some(t => t.name === currentTheme.name);
                
                if (!isAlreadyCompleted) {
                    // Tamamlanan temayı kaydet
                    this.state.completedThemes.push({
                        name: currentTheme.name,
                        rewardImage: currentTheme.rewardImage
                    });
                }

                // Tema indeksini artır
                this.state.currentThemeIndex++;
                
                // Soru indeksini sıfırla
                this.state.currentQuestionIndex = 0;

                console.log(`Sonraki tema indeksi: ${this.state.currentThemeIndex}`);
                console.log(`Toplam tema sayısı: ${this.state.gameData.themes.length}`);

                // Oyunu kaydet
                this.state.saveGame();

                // Kontrol için mevcut tema indeksini kullan (artırılmadan önceki değer)
                const completedThemeIndex = this.state.currentThemeIndex - 1;
                
                // Eğer son tema tamamlandıysa kavuşma ekranına geç
                if (completedThemeIndex === this.state.gameData.themes.length - 1) {
                    console.log('Son tema tamamlandı, kavuşma ekranına geçiliyor');
                    console.log(`Tamamlanan tema indeksi: ${completedThemeIndex}`);
                    console.log('Toplam tema sayısı:', this.state.gameData.themes.length);
                    console.log('Kavuşma resmi yolu:', this.state.gameData.kavusmaImage);
                    this.showKavusmaIntroScreen();
                } else if (this.state.currentThemeIndex >= this.state.gameData.themes.length) {
                    // Tüm temalar tamamlandı, final ekranına geç
                    console.log('Tüm temalar tamamlandı, final ekranına geçiliyor');
                    console.log(`Son tema indeksi: ${this.state.currentThemeIndex}, Toplam tema: ${this.state.gameData.themes.length}`);
                    this.showFinalScreen();
                } else {
                    console.log('Sonraki tema var, ödül ekranına geçiliyor');
                    console.log(`Sonraki tema indeksi: ${this.state.currentThemeIndex}`);
                    // Ödül ekranını göster
                    this.showRewardScreen(currentTheme.rewardImage);
                }
            } catch (error) {
                console.error('Doğum günü oyunu tamamlanırken hata:', error);
                // Hata durumunda direkt final ekranına geç
                this.showFinalScreen();
            }
        }, 3000);
    }

    showRewardScreen(rewardImagePath) {
        const rewardImage = document.getElementById('rewardImage');
        const lockOverlay = document.querySelector('.lock-overlay');
        
        // Ödül resmini yükle
        rewardImage.src = rewardImagePath;
        
        // Kilit açma animasyonu
        setTimeout(() => {
            lockOverlay.classList.add('unlocked');
            rewardImage.classList.add('revealed');
        }, 300);

        this.showScreen('reward');
    }

    showFinalScreen() {
        const rewardsGallery = document.getElementById('rewardsGallery');
        const completedThemesGrid = document.getElementById('completedThemesGrid');
        rewardsGallery.innerHTML = '';
        completedThemesGrid.innerHTML = '';

        // Tüm ödül fotoğraflarını göster
        this.state.completedThemes.forEach(theme => {
            const img = document.createElement('img');
            img.src = theme.rewardImage;
            img.alt = theme.name;
            img.title = theme.name;
            rewardsGallery.appendChild(img);
        });

        // Tamamlanan tema kartlarını oluştur
        // Unique temaları al (aynı isimde olanları filtrele)
        const uniqueThemes = this.state.completedThemes.filter((theme, index, self) => 
            index === self.findIndex(t => t.name === theme.name)
        );
        
        uniqueThemes.forEach((theme, index) => {
            const themeCard = document.createElement('div');
            themeCard.className = 'completed-theme-card';
            
            // Tema adı
            const themeName = document.createElement('h5');
            themeName.textContent = theme.name;
            
            // Tema açıklaması
            const themeDescription = document.createElement('p');
            const originalTheme = this.state.gameData.themes.find(t => t.name === theme.name);
            
            if (originalTheme && originalTheme.type === 'heart_game') {
                themeDescription.textContent = '💕 Kalp Oyunu - Fotoğrafı keşfet!';
            } else if (originalTheme && originalTheme.type === 'birthday_game') {
                themeDescription.textContent = '🎂 Doğum Günü Oyunu - Eğlenceli soru!';
            } else if (originalTheme) {
                themeDescription.textContent = `${originalTheme.questions.length} soru ile ${theme.name} temasını keşfet!`;
            } else {
                themeDescription.textContent = `${theme.name} temasını tekrar keşfet!`;
            }
            
            // Tema türü
            const themeType = document.createElement('div');
            themeType.className = 'theme-type';
            
            if (originalTheme && originalTheme.type === 'heart_game') {
                themeType.textContent = '🎮 Oyun';
            } else if (originalTheme && originalTheme.type === 'birthday_game') {
                themeType.textContent = '🎂 Özel';
            } else {
                themeType.textContent = '❓ Soru';
            }
            
            // Kartı oluştur
            themeCard.appendChild(themeName);
            themeCard.appendChild(themeDescription);
            themeCard.appendChild(themeType);
            
            // Tıklama olayı ekle
            themeCard.addEventListener('click', () => {
                this.replayTheme(theme.name);
            });
            
            completedThemesGrid.appendChild(themeCard);
        });

        this.showScreen('final');
    }

    showKavusmaIntroScreen() {
        console.log('showKavusmaIntroScreen çağrıldı');
        console.log('gameData:', this.state.gameData);
        console.log('gameData.kavusmaImage:', this.state.gameData.kavusmaImage);
        
        // Kavuşma giriş resmini yükle
        const kavusmaIntroImage = document.getElementById('kavusmaIntroImage');
        if (kavusmaIntroImage) {
            // Resim yolunu kontrol et
            const imagePath = this.state.gameData.kavusmaImage;
            console.log('Kullanılacak resim yolu:', imagePath);
            
            // Resim yükleme hatasını yakala
            kavusmaIntroImage.onerror = () => {
                console.error('Resim yüklenemedi:', imagePath);
                console.error('Resim elementi:', kavusmaIntroImage);
                // Hata durumunda varsayılan resim göster
                console.log('Varsayılan resim deneniyor: assets/kavusma.png');
                kavusmaIntroImage.src = 'assets/kavusma.png';
            };
            
            // Resim yükleme başarısını yakala
            kavusmaIntroImage.onload = () => {
                console.log('Resim başarıyla yüklendi:', imagePath);
                
                // Loading göstergesini gizle, resmi göster
                const loadingElement = document.getElementById('kavusmaIntroLoading');
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                kavusmaIntroImage.style.display = 'block';
            };
            
            // Resmi yükle
            kavusmaIntroImage.src = imagePath;
            console.log('Resim yolu ayarlandı:', kavusmaIntroImage.src);
            
        } else {
            console.error('kavusmaIntroImage elementi bulunamadı');
        }
        
        // Kavuşma giriş ekranını göster
        this.showScreen('kavusmaIntro');
    }

    // Navigasyon geçmişi
    navigationHistory = [];

    // Ekran geçişlerini kaydet
    showScreen(screenName) {
        // Mevcut ekranı geçmişe ekle
        const currentScreen = Object.keys(this.screens).find(key => this.screens[key].classList.contains('active'));
        if (currentScreen && currentScreen !== screenName) {
            this.navigationHistory.push(currentScreen);
        }

        // Tüm ekranları gizle
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // İstenen ekranı göster
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }

    // Geri dönme fonksiyonu
    goBack() {
        if (this.navigationHistory.length > 0) {
            const previousScreen = this.navigationHistory.pop();
            this.showScreen(previousScreen);
        } else {
            // Geçmiş yoksa ana menüye dön
            this.goToMainMenu();
        }
    }

    // Ana menüye dönme fonksiyonu
    goToMainMenu() {
        // Navigasyon geçmişini temizle
        this.navigationHistory = [];
        
        // Oyun durumunu sıfırla
        this.state.currentThemeIndex = 0;
        this.state.currentQuestionIndex = 0;
        this.state.completedThemes = [];
        
        // Ana menüye dön
        this.showScreen('start');
        
        // Kayıt bilgilerini güncelle
        this.checkSaveGame();
    }

    showKavusmaScreen() {
        const kavusmaImage = document.getElementById('kavusmaImage');
        kavusmaImage.src = this.state.gameData.kavusmaImage;
        
        // Kartı sıfırla
        const kavusmaCard = document.getElementById('kavusmaCard');
        kavusmaCard.classList.remove('flipped');
        
        this.showScreen('kavusma');
    }

    flipKavusmaCard() {
        const kavusmaCard = document.getElementById('kavusmaCard');
        const kavusmaImage = document.getElementById('kavusmaImage');
        
        // Eğer kart zaten çevrilmişse, eski haline döndür
        if (kavusmaCard.classList.contains('flipped')) {
            kavusmaCard.classList.remove('flipped');
            kavusmaImage.src = this.state.gameData.kavusmaImage;
        } else {
            // Kartı çevir
            kavusmaCard.classList.add('flipped');
            
            // 0.2 saniye sonra fotoğrafı değiştir
            setTimeout(() => {
                kavusmaImage.src = this.state.gameData.kavustukkImage;
            }, 200);
        }
    }

    restartGame() {
        // Mevcut kaydı sil
        localStorage.removeItem('istanbulMacerasi_save');
        
        // Oyunu sıfırla - gameData'yı koru
        const currentGameData = this.state.gameData;
        this.state = new GameState();
        this.state.gameData = currentGameData; // Mevcut veriyi koru
        
        // Başlangıç ekranını güncelle
        this.checkSaveGame();
        
        this.showScreen('start');
    }

    replayTheme(themeName) {
        // Seçilen temaya geç
        const themeIndex = this.state.gameData.themes.findIndex(t => t.name === themeName);
        if (themeIndex !== -1) {
            // Mevcut completedThemes listesini koru
            const currentCompletedThemes = [...this.state.completedThemes];
            
            // Oyun durumunu güncelle
            this.state.currentThemeIndex = themeIndex;
            this.state.currentQuestionIndex = 0;
            
            // completedThemes listesini geri yükle
            this.state.completedThemes = currentCompletedThemes;
            
            // Oyunu kaydet
            this.state.saveGame();
            
            // Harita ekranına geç
            this.showMapScreen();
        } else {
            console.error(`Tema bulunamadı: ${themeName}`);
            this.showScreen('final'); // Final ekranına geri dön
        }
    }
}



// Görsel yükleme hatalarını yakala
window.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
        console.warn('Görsel yüklenemedi:', e.target.src);
        // Varsayılan görsel veya placeholder göster
        e.target.style.display = 'none';
    }
});

// Touch olayları için mobil uyumluluk
document.addEventListener('touchstart', function() {}, {passive: true});
document.addEventListener('touchmove', function() {}, {passive: true}); 