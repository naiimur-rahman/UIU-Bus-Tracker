import { state } from './state.js';

export const closeWelcomeModal = () => {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
        localStorage.setItem('welcome_closed', 'true');
        document.documentElement.classList.add('hide-welcome');
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 500);
    }
};

export const toggleTheme = (updateMapStyle) => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
    if (updateMapStyle) updateMapStyle();
};

export const loadTheme = () => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

export const switchView = (viewId) => {
    document.getElementById('selection-loader').classList.add('hidden');
    document.getElementById('route-sub-select').classList.add('hidden');

    const views = document.querySelectorAll('.view-section');
    views.forEach(el => {
        el.classList.remove('view-active');
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '0';
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('view-active');
        void target.offsetWidth; 
        target.style.opacity = '1';
        target.style.pointerEvents = 'auto';
        target.style.zIndex = '100';
        target.style.visibility = 'visible';
    }

    const globalControls = document.getElementById('global-controls');
    if (globalControls) {
        if (viewId === 'view-landing') {
            globalControls.classList.remove('opacity-0', 'pointer-events-none', 'invisible');
        } else {
            globalControls.classList.add('opacity-0', 'pointer-events-none', 'invisible');
        }
    }
};

export const toggleBottomSheet = () => {
    const sheet = document.getElementById('bottom-sheet');
    if (sheet.classList.contains('translate-y-0')) {
        sheet.classList.remove('translate-y-0');
        sheet.classList.add('translate-y-[80%]');
    } else {
        sheet.classList.remove('translate-y-[80%]');
        sheet.classList.add('translate-y-0');
    }
};
