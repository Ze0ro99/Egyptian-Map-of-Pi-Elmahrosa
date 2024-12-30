# Contributing to Egyptian Map of Pi

## Table of Contents
- [Introduction](#introduction)
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Technical Requirements](#technical-requirements)
- [Localization Guidelines](#localization-guidelines)

## Introduction

Welcome to the Egyptian Map of Pi project! This marketplace application connects Egyptian merchants with buyers using Pi cryptocurrency while adhering to local regulations and cultural preferences. We appreciate your interest in contributing to our platform.

### Project Overview

The Egyptian Map of Pi is a specialized implementation of the Map of Pi platform designed for the Egyptian market within the Pi Network ecosystem. Our primary stakeholders include:

- Egyptian merchants
- Local consumers
- Pi Network pioneers
- Pi Core Team

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors while respecting Egyptian cultural values and market considerations. All participants must:

- Use welcoming and inclusive language in both Arabic and English
- Respect different viewpoints and experiences
- Show empathy towards other community members
- Prioritize the Egyptian market's unique requirements
- Adhere to Pi Network's community guidelines

## Getting Started

### Prerequisites

1. Pi Network SDK setup
   - Latest Pi Network SDK version
   - Pi Browser development environment
   - Pi Wallet API access

2. Development tools
   - Node.js 18 LTS
   - npm 9.8+
   - Git 2.40+
   - VS Code with RTL support plugins

### Development Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/egyptian-map-of-pi.git
cd egyptian-map-of-pi
```

2. Install dependencies:
```bash
npm install
```

3. Configure local environment:
```bash
cp .env.example .env
# Configure environment variables for Pi Network integration
```

## Development Workflow

### Branch Naming Convention

All branches must follow the pattern:
```
^(feature|bugfix|hotfix|release)/(EMP-\d+)-[a-z0-9-]+$
```

Examples:
- `feature/EMP-123-add-egyptian-payment-validation`
- `bugfix/EMP-456-fix-arabic-rtl-layout`

### Commit Message Format

Follow the conventional commits specification with project-specific scopes:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

Scopes:
- `frontend-rtl`
- `backend`
- `auth-pi`
- `payments-pi`
- `location-egypt`
- `messages-ar`
- `marketplace-local`

### Pull Request Process

1. Create a feature branch from `develop`
2. Implement changes following our technical requirements
3. Ensure all tests pass, including Arabic language tests
4. Update documentation in both English and Arabic
5. Submit PR using the provided template
6. Obtain required approvals:
   - Standard changes: 2 reviewers with RTL expertise
   - Security-critical changes: 3 reviewers + Pi Network security team

## Technical Requirements

### Code Style Guidelines

1. JavaScript/TypeScript:
   - ESLint + Prettier with RTL rules
   - Follow Pi Network security best practices
   - Support Arabic character handling

2. Documentation:
   - JSDoc format with cultural context notes
   - Bilingual comments (English/Arabic)
   - OpenAPI 3.0 with bilingual descriptions

### Testing Requirements

Minimum test coverage: 80%

Required tests:
- Unit Tests with Arabic locale
- Integration Tests with Pi Network
- E2E Tests with Egyptian scenarios
- RTL Layout Tests
- Mobile Responsiveness Tests
- Cultural Sensitivity Tests

### Security Guidelines

1. Authentication/Authorization:
   - Implement Pi Network authentication
   - Follow Egyptian data protection laws
   - Maintain secure session handling

2. Security Checks:
   - XSS Prevention with RTL considerations
   - CSRF Protection
   - Input validation for Arabic content
   - Pi Network security compliance
   - Egyptian market security standards

## Localization Guidelines

### Arabic Translation Requirements

1. Content must be provided in both English and Arabic
2. Arabic translations must be:
   - Grammatically correct
   - Culturally appropriate
   - Market-relevant
   - Technically accurate

### RTL Support Implementation

1. Layout Considerations:
   - Use CSS logical properties
   - Implement bidirectional UI components
   - Test with various Arabic fonts

2. Technical Requirements:
   - Use `dir="rtl"` attribute
   - Implement CSS logical properties
   - Support bidirectional text input

### Egyptian Market Considerations

1. Content Guidelines:
   - Respect local customs and traditions
   - Use Egyptian Arabic dialect when appropriate
   - Follow local business practices
   - Adhere to Egyptian e-commerce regulations

2. Market Validation:
   - Test with Egyptian users
   - Validate against local requirements
   - Consider local payment preferences
   - Ensure compatibility with Egyptian internet infrastructure

---

For additional information, please refer to:
- [Pull Request Template](.github/pull_request_template.md)
- [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)

Thank you for contributing to the Egyptian Map of Pi project! 🇪🇬 🥧