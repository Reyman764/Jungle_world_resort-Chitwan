import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/packages', label: 'Packages' },
  { to: '/tariff', label: 'Tariff' },
  { to: '/about-chitwan', label: 'About Chitwan' },
  { to: '/activities', label: 'Activities' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/gallery', label: 'Gallery' },
]

export default function Footer() {
  return (
    <footer className="footer">
      {/* Wildlife Silhouette SVG */}
      <div className="footer__silhouette">
        <svg viewBox="0 0 1440 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 180 L0 140 
            C20 140 30 120 45 115 C55 112 60 125 70 122 C80 119 78 100 90 95 C100 90 110 105 120 108
            C135 112 140 95 155 90 C165 86 168 100 175 103 C188 108 192 85 208 75 
            C222 66 228 82 240 85 C252 88 255 70 268 65 C282 60 285 78 295 82
            C310 87 315 68 330 60 C345 52 350 72 360 75 C372 79 374 58 388 50
            C402 42 408 60 418 65 C432 72 436 50 450 42 C464 34 470 55 482 60
            C496 66 500 45 515 40 C530 35 534 55 545 60 C558 65 562 44 576 38
            C592 32 596 52 610 58 C624 64 626 42 642 35 C658 28 664 50 678 56
            C692 62 696 40 710 35 C724 30 728 52 742 58 C754 64 758 45 771 40
            C785 35 788 54 800 60 C812 66 816 48 828 44 C842 40 845 58 858 64
            C870 70 874 52 886 48 C900 44 903 62 916 68 C930 74 934 55 948 50
            C962 45 966 64 978 70 C990 76 994 58 1006 54 C1020 50 1024 68 1036 72
            C1050 77 1054 58 1068 52 C1082 46 1088 67 1100 72 C1114 78 1118 60 1132 56
            C1146 52 1150 70 1162 75 C1174 80 1178 62 1192 58 C1206 54 1210 72 1222 76
            C1236 81 1240 64 1254 60 C1268 56 1272 74 1284 79 C1296 84 1300 66 1315 61
            C1330 56 1334 74 1348 78 C1362 82 1368 64 1382 60 C1396 56 1410 74 1420 78
            C1428 81 1432 70 1440 68 L1440 180 Z" 
            fill="#1a3a2a" opacity="0.6"/>
          <path d="M0 180 L0 155
            C30 152 50 138 70 133 C88 129 92 145 108 148 C124 151 128 133 145 128
            C162 123 166 140 182 145 C200 150 204 132 220 127 C238 122 244 138 260 142
            C278 146 282 130 298 125 C315 120 318 136 335 140 C352 145 356 128 372 123
            C390 118 394 135 411 140 C428 145 432 127 449 122 C466 117 470 134 486 139
            C504 144 508 127 524 122 C541 117 545 133 560 137 C577 142 580 125 596 120
            C614 115 618 132 634 137 C651 142 655 125 671 120 C688 115 692 132 708 136
            C725 141 728 124 745 119 C762 114 766 130 782 135 C800 140 804 123 820 118
            C838 113 842 130 858 135 C875 140 878 123 895 118 C912 113 916 130 932 134
            C949 139 952 122 968 117 C986 112 990 129 1006 133 C1024 138 1028 121 1044 116
            C1062 111 1066 128 1082 133 C1099 138 1102 121 1118 116 C1136 111 1140 128 1156 132
            C1173 137 1176 120 1192 115 C1210 110 1214 127 1230 132 C1247 137 1250 120 1267 115
            C1284 110 1288 127 1304 131 C1322 136 1326 119 1342 114 C1360 109 1364 126 1380 130
            C1397 135 1410 118 1425 115 C1432 113 1436 120 1440 122 L1440 180 Z"
            fill="#0d2218"/>
          {/* Trees */}
          <g fill="#0d2218">
            <ellipse cx="80" cy="95" rx="18" ry="30"/>
            <rect x="77" y="118" width="6" height="22"/>
            <ellipse cx="200" cy="80" rx="22" ry="35"/>
            <rect x="196" y="108" width="8" height="27"/>
            <ellipse cx="350" cy="88" rx="16" ry="26"/>
            <rect x="347" y="110" width="6" height="22"/>
            <ellipse cx="520" cy="72" rx="26" ry="42"/>
            <rect x="515" y="108" width="10" height="30"/>
            <ellipse cx="700" cy="82" rx="20" ry="32"/>
            <rect x="696" y="106" width="8" height="26"/>
            <ellipse cx="880" cy="76" rx="24" ry="38"/>
            <rect x="875" y="108" width="10" height="28"/>
            <ellipse cx="1050" cy="85" rx="18" ry="28"/>
            <rect x="1047" y="108" width="6" height="22"/>
            <ellipse cx="1220" cy="78" rx="22" ry="36"/>
            <rect x="1216" y="108" width="8" height="28"/>
            <ellipse cx="1380" cy="90" rx="16" ry="26"/>
            <rect x="1377" y="110" width="6" height="22"/>
          </g>
          {/* Sun/Moon */}
          <circle cx="1100" cy="60" r="30" fill="#c8973a" opacity="0.25"/>
          <circle cx="1100" cy="60" r="20" fill="#c8973a" opacity="0.35"/>
          {/* Birds */}
          <g fill="none" stroke="#c8973a" strokeWidth="1.5" opacity="0.6">
            <path d="M1050 30 Q1055 26 1060 30"/>
            <path d="M1065 22 Q1070 18 1075 22"/>
            <path d="M1080 28 Q1085 24 1090 28"/>
            <path d="M1035 40 Q1040 36 1045 40"/>
          </g>
          {/* Animals silhouettes */}
          <g fill="#0d2218" opacity="0.8">
            {/* Rhino */}
            <ellipse cx="420" cy="148" rx="28" ry="14"/>
            <ellipse cx="440" cy="140" rx="14" ry="10"/>
            <rect x="400" y="155" width="8" height="10"/>
            <rect x="415" y="157" width="8" height="10"/>
            <rect x="432" y="157" width="8" height="10"/>
            <rect x="447" y="155" width="8" height="10"/>
            <path d="M448 138 L458 132 L456 140" fill="#0d2218"/>
            {/* Elephant */}
            <ellipse cx="950" cy="146" rx="35" ry="16"/>
            <ellipse cx="970" cy="134" rx="16" ry="13"/>
            <rect x="926" y="156" width="9" height="12"/>
            <rect x="942" y="158" width="9" height="12"/>
            <rect x="958" y="158" width="9" height="12"/>
            <rect x="974" y="156" width="9" height="12"/>
            <path d="M978 138 Q990 135 988 148" stroke="#0d2218" strokeWidth="3" fill="none"/>
            {/* Deer */}
            <ellipse cx="650" cy="150" rx="14" ry="8"/>
            <rect x="642" y="153" width="5" height="10"/>
            <rect x="651" y="154" width="5" height="10"/>
            <ellipse cx="660" cy="143" rx="7" ry="6"/>
            <path d="M658 140 L654 130 M662 140 L666 130 M656 132 L660 128" stroke="#0d2218" strokeWidth="1.5" fill="none"/>
            {/* Watch tower */}
            <rect x="1320" y="95" width="4" height="55"/>
            <rect x="1310" y="95" width="4" height="55"/>
            <rect x="1307" y="90" width="24" height="20" fill="none" stroke="#0d2218" strokeWidth="2"/>
            <rect x="1305" y="85" width="28" height="6"/>
            <rect x="1310" y="130" width="14" height="20"/>
            <line x1="1310" y1="95" x2="1324" y2="95" stroke="#0d2218" strokeWidth="1.5"/>
            <line x1="1310" y1="105" x2="1324" y2="105" stroke="#0d2218" strokeWidth="1.5"/>
            <line x1="1310" y1="115" x2="1324" y2="115" stroke="#0d2218" strokeWidth="1.5"/>
          </g>
        </svg>
      </div>

      {/* Footer Content */}
      <div className="footer__body">
        <div className="footer__grid container">
          {/* Brand column */}
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-text">Jungle World Resort</span>
              <span className="footer__logo-sub">Chitwan National Park, Nepal</span>
            </div>
            <p className="footer__about">
              A serene sanctuary nestled at the gateway of Chitwan National Park. 
              Where wilderness meets luxury, and every dawn awakens to birdsong.
            </p>
            <div className="footer__social">
              <a href="#" className="social-btn" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </a>
              <a href="#" className="social-btn" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer__col">
            <h4 className="footer__heading">Quick Links</h4>
            <ul className="footer__links">
              {quickLinks.map(l => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h4 className="footer__heading">Contact Info</h4>
            <div className="footer__contact">
              <div className="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                <div>
                  <strong>Resort</strong><br/>
                  Sauraha, Chitwan National Park
                </div>
              </div>
              <div className="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                <div>
                  <strong>Office</strong><br/>
                  Thamel, Kathmandu, Nepal
                </div>
              </div>
              <div className="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81"/></svg>
                <div>056-580068 / 580100<br/>+977 9851198992</div>
              </div>
              <div className="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <div>info@jungleworldresort.com</div>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="footer__col">
            <h4 className="footer__heading">Newsletter</h4>
            <p className="footer__newsletter-text">Subscribe for travel tips & exclusive offers from the heart of Chitwan.</p>
            <div className="footer__newsletter">
              <input type="email" placeholder="Your email address" />
              <button>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer__bottom">
          <div className="container">
            <div className="footer__bottom-inner">
              <p>(c) 2026 Jungle World Resort. All rights reserved.</p>
              <p>Sauraha, Chitwan National Park, Nepal</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
