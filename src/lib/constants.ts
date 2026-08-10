export const ROUTES = [
    { href: '/', isFooter: true, isNavbar: false, label: 'Home' },
    { href: '/#about', isFooter: true, isNavbar: true, label: 'About us' },
    { href: '/#team', isFooter: false, isNavbar: true, label: 'Team' },
    { href: '/portfolio', isFooter: true, isNavbar: true, label: 'Portfolio' },
    { href: '/portfolio#collaborations', isFooter: true, isNavbar: false, label: 'Collaborations' },
] as const;
