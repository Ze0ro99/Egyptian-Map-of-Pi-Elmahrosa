# Egyptian Map of Pi - Web Frontend

## Overview

The Egyptian Map of Pi is a Progressive Web Application (PWA) designed specifically for the Egyptian market within the Pi Network ecosystem. This frontend application provides a secure, localized marketplace connecting Egyptian merchants with buyers using Pi cryptocurrency.

## Key Features

- 🌐 Arabic-first Progressive Web Application
- 🔒 Pi Network integration with secure authentication
- 📱 Mobile-optimized responsive design
- 🗺️ Egyptian location services integration
- 💬 Real-time messaging system
- 🌙 RTL support and dark mode
- ⚡ Offline capabilities

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Pi Browser (latest)
- AWS CLI configured for deployment
- Mapbox API key for location services

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/your-org/egyptian-map-of-pi.git
cd egyptian-map-of-pi/src/web
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Start development server:
```bash
npm run dev
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Jest tests
npm run type-check   # Run TypeScript checks
npm run analyze      # Analyze bundle size
```

## Project Structure

```
src/
├── components/      # Reusable UI components
├── config/         # Configuration files
├── contexts/       # React contexts
├── hooks/          # Custom React hooks
├── layouts/        # Page layouts
├── lib/           # Utility functions
├── pages/         # Next.js pages
├── public/        # Static assets
├── services/      # API services
├── store/         # Redux store
├── styles/        # Global styles
└── types/         # TypeScript definitions
```

## Core Technologies

- **Framework**: React 18.2.0 with Next.js 13.0.0
- **State Management**: Redux Toolkit 1.9.0
- **Styling**: Material-UI 5.14.0
- **Maps**: Mapbox GL JS 2.15.0
- **Internationalization**: i18next 22.0.0
- **Testing**: Jest 29.5.0
- **API Client**: Axios 1.5.0
- **WebSocket**: Socket.io-client 4.7.0

## Browser Support

- Pi Browser (latest) - Primary
- Chrome Mobile >= 80
- Safari iOS >= 12
- Firefox Mobile >= 95
- Opera Mobile >= 60

## Performance Targets

- First Contentful Paint: < 2s
- Time to Interactive: < 4s
- Lighthouse Score: > 90
- Offline Functionality
- PWA Installation

## Security Considerations

- HTTPS enforcement
- API key protection
- XSS prevention
- CSRF protection
- Content Security Policy
- Egyptian data compliance

## Development Guidelines

### RTL Development
- Use RTL-first approach
- Implement bidirectional UI patterns
- Test with Arabic content
- Follow Material Design RTL specs

### Performance Optimization
- Implement code splitting
- Optimize images
- Enable caching
- Minimize bundle size
- Use lazy loading

### Testing
- Write unit tests for components
- Implement integration tests
- Perform E2E testing
- Test RTL layouts
- Verify offline functionality

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### AWS Deployment
1. Configure AWS credentials
2. Build Docker image
3. Push to ECR
4. Deploy with ECS/EKS

### Security Measures
- Enable HTTPS
- Configure CSP headers
- Implement rate limiting
- Set up WAF rules
- Monitor security logs

## Monitoring

- Error tracking with Sentry
- Performance monitoring
- User analytics
- Security monitoring
- Uptime tracking

## Localization

- Primary: Arabic (ar-EG)
- Secondary: English (en)
- RTL support
- Number formatting
- Date/time formatting
- Currency display (EGP)

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

Copyright © 2023 Pi Network. All rights reserved.

## Support

For technical support, please contact:
- Email: support@egyptianmapofpi.com
- Documentation: docs.egyptianmapofpi.com
- Issue Tracker: GitHub Issues

## Acknowledgments

- Pi Network Team
- Egyptian Developer Community
- Open Source Contributors