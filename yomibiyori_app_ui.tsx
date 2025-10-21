import React, { useState, useEffect } from 'react';

const YomibiyoriApp = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [username, setUsername] = useState('');
  const [myPoems, setMyPoems] = useState([]);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [inputVerse, setInputVerse] = useState('');
  const [appreciationCategory, setAppreciationCategory] = useState(null);
  const [showActionSelection, setShowActionSelection] = useState(false);
  
  // カテゴリー別のお題データ
  const themes = {
    love: {
      name: '恋愛',
      icon: 'favorite',
      upperVerse: '君を待つ 心ときめき',
      sponsor: 'ブライダルサロン 花結び'
    },
    scenery: {
      name: '情景',
      icon: 'landscape',
      upperVerse: '五月雨を あつめて早し',
      sponsor: '旅館 山水亭'
    },
    season: {
      name: '季節',
      icon: 'ac_unit',
      upperVerse: '冬の朝 霜を纏いて',
      sponsor: '和菓子処 月見堂'
    },
    emotion: {
      name: '心情',
      icon: 'psychology',
      upperVerse: '静寂に 響く鼓動は',
      sponsor: 'カフェ 心の音'
    }
  };
  
  // 時刻によるフェーズ判定
  const getPhase = () => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    
    if (hour >= 6 && (hour < 21 || (hour === 21 && minute < 59))) {
      if (hour === 21 && minute >= 50) return 'closing';
      return 'normal';
    }
    return 'afterhours';
  };
  
  const phase = getPhase();
  
  // 締切までの時間計算
  const getTimeUntilDeadline = () => {
    const deadline = new Date(currentTime);
    deadline.setHours(21, 59, 0, 0);
    
    if (currentTime > deadline) {
      deadline.setDate(deadline.getDate() + 1);
    }
    
    const diff = deadline - currentTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  
  // タイマー更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // サンプルデータ
  const samplePoems = [
    { id: 1, author: '花子', category: 'season', upperVerse: '冬の朝 霜を纏いて', lowerVerse: '白き息 光る道', resonance: 42 },
    { id: 2, author: '太郎', category: 'love', upperVerse: '君を待つ 心ときめき', lowerVerse: '夜の星 瞬きて', resonance: 38 },
    { id: 3, author: 'さくら', category: 'scenery', upperVerse: '五月雨を あつめて早し', lowerVerse: '最上川 流れゆく', resonance: 35 },
    { id: 4, author: '健二', category: 'emotion', upperVerse: '静寂に 響く鼓動は', lowerVerse: '胸の奥 想い秘めて', resonance: 28 },
    { id: 5, author: '美咲', category: 'season', upperVerse: '冬の朝 霜を纏いて', lowerVerse: '銀世界 目覚める朝', resonance: 31 },
    { id: 6, author: '隆', category: 'love', upperVerse: '君を待つ 心ときめき', lowerVerse: '永遠の 愛を誓う', resonance: 25 },
    { id: 7, author: 'あい', category: 'scenery', upperVerse: '五月雨を あつめて早し', lowerVerse: '山々は 緑に染まる', resonance: 29 },
    { id: 8, author: '誠', category: 'emotion', upperVerse: '静寂に 響く鼓動は', lowerVerse: '明日への 希望を抱く', resonance: 33 },
  ];
  
  const rankingData = [
    { rank: 1, author: '花子', verse: '冬の朝 霜を纏いて 白き息 光る道', category: 'season', score: 42.8, resonance: 42 },
    { rank: 2, author: '太郎', verse: '君を待つ 心ときめき 夜の星 瞬きて', category: 'love', score: 38.5, resonance: 38 },
    { rank: 3, author: 'さくら', verse: '五月雨を あつめて早し 最上川 流れゆく', category: 'scenery', score: 35.2, resonance: 35 },
    { rank: 4, author: '誠', verse: '静寂に 響く鼓動は 明日への 希望を抱く', category: 'emotion', score: 33.1, resonance: 33 },
    { rank: 5, author: '美咲', verse: '冬の朝 霜を纏いて 銀世界 目覚める朝', category: 'season', score: 31.4, resonance: 31 },
  ];

  // LoginScreen Component
  const LoginScreen = () => (
    <div className="flex-grow flex flex-col items-center justify-center px-6 pb-20">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-display font-bold text-primary dark:text-primary mb-4">
            よみびより
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            毎日一句、心を詠む
          </p>
        </div>
        
        <div className="bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-2xl p-8 shadow-xl">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="ユーザー名"
              className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            
            <button
              onClick={() => {
                if (username.trim()) {
                  setIsLoggedIn(true);
                  setCurrentScreen('home');
                }
              }}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              ログイン
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/70 dark:bg-black/30 text-gray-600 dark:text-gray-400">
                  または
                </span>
              </div>
            </div>
            
            <button className="w-full py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-xl font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">mail</span>
              Googleでログイン
            </button>
          </div>
        </div>
        
        <p className="mt-6 text-center text-xs text-gray-600 dark:text-gray-400">
          ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
        </p>
      </div>
    </div>
  );

  // CategorySelectionScreen (新しいホーム画面)
  const CategorySelectionScreen = () => {
    // アクション選択画面
    if (showActionSelection && selectedCategory) {
      const currentTheme = themes[selectedCategory];
      
      return (
        <div className="flex-grow flex flex-col items-center justify-center px-4 pb-24">
          <div className="w-full max-w-md">
            {/* 戻るボタン */}
            <button
              onClick={() => {
                setShowActionSelection(false);
                setSelectedCategory(null);
              }}
              className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">
                arrow_back
              </span>
            </button>
            
            {/* 選択したカテゴリー表示 */}
            <div className="text-center mb-8">
              <span className="material-symbols-outlined text-6xl text-primary dark:text-primary mb-4 inline-block">
                {currentTheme.icon}
              </span>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                {currentTheme.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                何をしますか？
              </p>
            </div>
            
            {/* アクション選択ボタン */}
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowActionSelection(false);
                  setCurrentScreen('input');
                }}
                disabled={phase === 'afterhours'}
                className="w-full flex items-center justify-between p-6 bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-2xl shadow-xl hover:bg-white/90 dark:hover:bg-black/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-primary">
                      edit_note
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      一句を詠む
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {phase === 'afterhours' ? '投稿は明日6:00から' : '下の句を投稿する'}
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400">
                  chevron_right
                </span>
              </button>
              
              <button
                onClick={() => {
                  setAppreciationCategory(selectedCategory);
                  setShowActionSelection(false);
                  setCurrentPoemIndex(0);
                  setCurrentScreen('appreciation');
                }}
                className="w-full flex items-center justify-between p-6 bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-2xl shadow-xl hover:bg-white/90 dark:hover:bg-black/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-primary">
                      auto_stories
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      作品を鑑賞
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      他の人の一句を楽しむ
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // カテゴリー選択画面
    return (
      <div className="flex-grow flex flex-col items-center justify-center px-4 pb-24">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-bold mb-8 text-center text-gray-800 dark:text-gray-200">
            お題を選んで一句
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedCategory(key);
                  setShowActionSelection(true);
                }}
                className="flex flex-col items-center justify-center rounded-xl p-6 h-36 bg-white/60 dark:bg-black/25 backdrop-blur-md shadow-lg hover:bg-white/90 dark:hover:bg-black/40 transition-colors"
              >
                <span className="material-symbols-outlined text-5xl text-primary dark:text-primary mb-3">
                  {theme.icon}
                </span>
                <span className="text-base font-semibold text-gray-800 dark:text-gray-200">
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // PoemInputScreen (投稿画面)
  const PoemInputScreen = () => {
    const currentTheme = themes[selectedCategory];
    
    return (
      <div className="flex-grow flex flex-col bg-neutral dark:bg-neutral-dark">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-4 bg-white/70 dark:bg-black/30 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setCurrentScreen('home');
              setShowActionSelection(false);
              setSelectedCategory(null);
              setInputVerse('');
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">
              close
            </span>
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            下の句を詠む
          </h2>
          <div className="w-10"></div>
        </div>
        
        {/* 締切タイマー */}
        <div className={`mx-4 mt-4 rounded-xl p-3 text-center ${
          phase === 'closing' 
            ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-400' 
            : 'bg-primary/10 dark:bg-primary/20'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-primary text-sm">
              schedule
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              締切まで {getTimeUntilDeadline()}
            </span>
          </div>
        </div>
        
        {/* メイン表示エリア */}
        <div className="flex-grow flex items-center justify-center px-8 py-8">
          <div className="flex items-start justify-center gap-12">
            {/* 上の句（右側） */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">上の句</div>
              <div className="vertical-text text-2xl text-gray-800 dark:text-gray-200 tracking-wider h-80 flex items-center">
                {currentTheme.upperVerse}
              </div>
            </div>
            
            {/* 下の句入力（左側） */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">七七</div>
              <div className="relative">
                <textarea
                  value={inputVerse}
                  onChange={(e) => setInputVerse(e.target.value.slice(0, 20))}
                  placeholder="七七"
                  className="vertical-text text-2xl bg-white/50 dark:bg-black/20 border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-4 tracking-wider h-80 w-16 resize-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                  style={{ writingMode: 'vertical-rl' }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {inputVerse.length}/20
              </div>
            </div>
          </div>
        </div>
        
        {/* スポンサー表示 */}
        <div className="px-4 pb-2 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            提供: {currentTheme.sponsor}
          </span>
        </div>
        
        {/* 投稿ボタン */}
        <div className="px-4 pb-24">
          <button
            onClick={() => {
              if (inputVerse.trim()) {
                setMyPoems([...myPoems, {
                  id: Date.now(),
                  category: selectedCategory,
                  upperVerse: currentTheme.upperVerse,
                  lowerVerse: inputVerse,
                  verse: `${currentTheme.upperVerse} ${inputVerse}`,
                  date: new Date().toLocaleDateString('ja-JP'),
                  resonance: 0
                }]);
                setInputVerse('');
                setAppreciationCategory(selectedCategory);
                setCurrentScreen('appreciation');
              }
            }}
            disabled={!inputVerse.trim()}
            className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
          >
            投稿
          </button>
        </div>
      </div>
    );
  };

  // AppreciationScreen Component
  const AppreciationScreen = () => {
    // カテゴリー未選択の場合はホーム画面に戻す
    if (!appreciationCategory) {
      setCurrentScreen('home');
      return null;
    }
    
    // カテゴリー選択後は作品表示
    const [liked, setLiked] = useState(false);
    const filteredPoems = samplePoems.filter(poem => poem.category === appreciationCategory);
    
    if (filteredPoems.length === 0) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center px-4 pb-24">
          <div className="w-full max-w-md text-center">
            <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
              sentiment_dissatisfied
            </span>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              このカテゴリーにはまだ作品がありません
            </p>
            <button
              onClick={() => {
                setAppreciationCategory(null);
                setCurrentScreen('home');
              }}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      );
    }
    
    const currentPoem = filteredPoems[currentPoemIndex];
    
    const handleSwipe = (direction) => {
      if (direction === 'next' && currentPoemIndex < filteredPoems.length - 1) {
        setCurrentPoemIndex(currentPoemIndex + 1);
        setLiked(false);
      } else if (direction === 'prev' && currentPoemIndex > 0) {
        setCurrentPoemIndex(currentPoemIndex - 1);
        setLiked(false);
      }
    };
    
    return (
      <div className="flex-grow flex flex-col px-4 pb-24">
        {/* ヘッダー */}
        <div className="flex items-center justify-between py-4">
          <button
            onClick={() => {
              setAppreciationCategory(null);
              setCurrentPoemIndex(0);
              setCurrentScreen('home');
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">
              arrow_back
            </span>
          </button>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {themes[appreciationCategory]?.name}の一句
          </h2>
          <div className="w-10"></div>
        </div>
        
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="w-full max-w-md">
            {/* カテゴリーバッジ */}
            <div className="flex justify-center mb-4">
              <span className="text-sm font-semibold text-secondary dark:text-secondary px-4 py-1 bg-secondary/10 rounded-full">
                {themes[currentPoem.category]?.name}
              </span>
            </div>
            
            {/* 作品カード */}
            <div className="bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-2xl p-8 shadow-2xl mb-6">
              <div className="flex flex-col items-center space-y-6">
                <div className="flex justify-center items-center min-h-[300px] py-8">
                  <div className="flex gap-12 items-start">
                    <div className="vertical-text text-2xl font-display text-gray-800 dark:text-gray-200 tracking-wider h-72 flex items-center">
                      {currentPoem.upperVerse}
                    </div>
                    <div className="vertical-text text-2xl font-display text-gray-700 dark:text-gray-300 tracking-wider h-72 flex items-center">
                      {currentPoem.lowerVerse}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between w-full pt-6 border-t border-gray-300 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
                      person
                    </span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {currentPoem.author}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => setLiked(!liked)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      liked 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span className={`material-symbols-outlined ${liked ? 'fill' : ''}`}>
                      favorite
                    </span>
                    <span className="font-semibold">
                      {currentPoem.resonance + (liked ? 1 : 0)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* スワイプナビゲーション */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => handleSwipe('prev')}
                disabled={currentPoemIndex === 0}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white/70 dark:bg-black/30 backdrop-blur-lg shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-black/50 transition-colors"
              >
                <span className="material-symbols-outlined text-primary">
                  chevron_left
                </span>
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {currentPoemIndex + 1} / {filteredPoems.length}
              </span>
              
              <button
                onClick={() => handleSwipe('next')}
                disabled={currentPoemIndex === filteredPoems.length - 1}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white/70 dark:bg-black/30 backdrop-blur-lg shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-black/50 transition-colors"
              >
                <span className="material-symbols-outlined text-primary">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // RankingScreen Component
  const RankingScreen = () => {
    const [selectedDate, setSelectedDate] = useState('today');
    const isAfterRanking = phase === 'afterhours';
    
    return (
      <div className="flex-grow px-4 py-6 pb-24 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">
            今日のランキング
          </h2>
          
          {/* 日付切り替えタブ */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {['today', 'yesterday', 'dayBefore'].map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  selectedDate === date
                    ? 'bg-primary text-white'
                    : 'bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-400'
                }`}
              >
                {date === 'today' ? '今日' : date === 'yesterday' ? '昨日' : '一昨日'}
              </button>
            ))}
          </div>
          
          {isAfterRanking && (
            <div className="mb-4 p-3 bg-primary/10 dark:bg-primary/20 rounded-xl text-center">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                📸 22:00時点のスナップショット
              </span>
            </div>
          )}
          
          {/* ランキングリスト */}
          <div className="space-y-3">
            {rankingData.map((item) => (
              <div
                key={item.rank}
                className="bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-xl p-4 shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    item.rank === 1 
                      ? 'bg-yellow-400 text-yellow-900' 
                      : item.rank === 2 
                      ? 'bg-gray-300 text-gray-700'
                      : item.rank === 3
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {item.rank}
                  </div>
                  
                  <div className="flex-grow flex justify-center">
                    <p className="vertical-text text-base text-gray-800 dark:text-gray-200 tracking-wide h-32">
                      {item.verse}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0 flex flex-col items-end gap-2 text-sm">
                    <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-secondary/10 rounded">
                      {themes[item.category]?.name}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">
                      {item.author}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <span className="material-symbols-outlined text-sm">favorite</span>
                      {item.resonance}
                    </span>
                    <span className="font-bold text-primary text-base">
                      {item.score.toFixed(1)}pt
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // MyPageScreen Component
  const MyPageScreen = () => {
    const totalResonance = myPoems.reduce((sum, poem) => sum + poem.resonance, 0);
    const avgResonance = myPoems.length > 0 ? (totalResonance / myPoems.length).toFixed(1) : 0;
    
    return (
      <div className="flex-grow px-4 py-6 pb-24 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          {/* プロフィールカード */}
          <div className="bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-2xl p-6 shadow-xl text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-primary">
                person
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              {username || 'ゲスト'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              よみびよりユーザー
            </p>
          </div>
          
          {/* 統計情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-3xl text-primary mb-2">
                edit_note
              </span>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {myPoems.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                投稿数
              </div>
            </div>
            
            <div className="bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-3xl text-red-600 mb-2">
                favorite
              </span>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {avgResonance}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                平均共鳴
              </div>
            </div>
          </div>
          
          {/* 過去の作品 */}
          <div className="bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">auto_stories</span>
              過去の作品
            </h3>
            
            {myPoems.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                まだ作品がありません
              </p>
            ) : (
              <div className="space-y-3">
                {myPoems.map((poem) => (
                  <div
                    key={poem.id}
                    className="p-4 bg-white/50 dark:bg-black/20 rounded-lg"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-secondary/10 rounded">
                        {themes[poem.category]?.name}
                      </span>
                    </div>
                    <div className="flex justify-center mb-3">
                      <p className="vertical-text text-sm text-gray-700 dark:text-gray-300 tracking-wide h-24">
                        {poem.verse}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-2">
                      <span>{poem.date}</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">favorite</span>
                        {poem.resonance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 設定 */}
          <div className="bg-white/70 dark:bg-black/30 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">settings</span>
              設定
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-full flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg hover:bg-white/70 dark:hover:bg-black/30 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">ダークモード</span>
                <span className="material-symbols-outlined text-primary">
                  {isDarkMode ? 'dark_mode' : 'light_mode'}
                </span>
              </button>
              
              <button className="w-full flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg hover:bg-white/70 dark:hover:bg-black/30 transition-colors">
                <span className="text-gray-700 dark:text-gray-300">通知設定</span>
                <span className="material-symbols-outlined text-primary">
                  notifications
                </span>
              </button>
              
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setCurrentScreen('login');
                  setUsername('');
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <span className="material-symbols-outlined">logout</span>
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // BottomNavigation Component
  const BottomNavigation = () => {
    if (!isLoggedIn) return null;
    
    const navItems = [
      { id: 'home', icon: 'home', label: 'ホーム', disabled: false },
      { id: 'ranking', icon: 'leaderboard', label: 'ランキング', disabled: false },
      { id: 'mypage', icon: 'person', label: 'マイページ', disabled: false },
    ];
    
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/70 dark:bg-black/25 backdrop-blur-lg shadow-lg z-50 border-t border-gray-200 dark:border-gray-700">
        <div className="mx-auto flex h-full max-w-md items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (currentScreen !== item.id) {
                  setShowActionSelection(false);
                  setSelectedCategory(null);
                  setAppreciationCategory(null);
                  setCurrentPoemIndex(0);
                }
                setCurrentScreen(item.id);
              }}
              disabled={item.disabled}
              className={`flex flex-col items-center justify-center transition-colors ${
                currentScreen === item.id
                  ? 'text-primary dark:text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary'
              } ${item.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <span className="material-symbols-outlined">
                {item.icon}
              </span>
              <span className={`text-xs ${currentScreen === item.id ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    );
  };

  // Main Render
  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Noto+Sans+JP:wght@100..900&display=swap');
        
        body {
          font-family: 'Noto Sans JP', sans-serif;
        }
        
        .material-symbols-outlined.fill {
          font-variation-settings: 'FILL' 1;
        }
        
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: upright;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-neutral via-background-light to-neutral dark:from-neutral-dark dark:via-background-dark dark:to-neutral-dark">
        <div className="flex flex-col h-screen w-full font-sans text-text-light dark:text-text-dark">
          {currentScreen === 'login' && <LoginScreen />}
          {currentScreen === 'home' && <CategorySelectionScreen />}
          {currentScreen === 'input' && <PoemInputScreen />}
          {currentScreen === 'appreciation' && <AppreciationScreen />}
          {currentScreen === 'ranking' && <RankingScreen />}
          {currentScreen === 'mypage' && <MyPageScreen />}
          
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
};

export default YomibiyoriApp;