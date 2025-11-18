# Versioning Guide

This project follows [Semantic Versioning](https://semver.org/) (SemVer).

## Version Format

**MAJOR.MINOR.PATCH** (e.g., `0.2.0`)

- **MAJOR** (0.x.x): Breaking changes
- **MINOR** (x.1.x): New features, backward compatible
- **PATCH** (x.x.1): Bug fixes, backward compatible

## Current Version

Check `VERSION` file or `package.json` for the current version.

## How to Update Version

### 1. Update Version Files

Update these files with the new version number:
- `VERSION` - Simple version file
- `package.json` - Update the `version` field

### 2. Update CHANGELOG.md

Add a new section at the top of `CHANGELOG.md`:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing features

### Fixed
- Bug fixes

### Removed
- Removed features
```

### 3. Commit and Tag

```bash
# Stage version files
git add VERSION package.json CHANGELOG.md

# Commit with version message
git commit -m "Bump version to vX.Y.Z"

# Create a git tag
git tag -a vX.Y.Z -m "Version X.Y.Z: Brief description"

# Push commits and tags
git push
git push --tags
```

## Version History

- **v0.2.0** - Map veto system, upload results improvements, mobile enhancements
- **v0.1.0** - Initial tournament bracket system

## Best Practices

1. **Always update CHANGELOG.md** when making changes
2. **Create git tags** for each version release
3. **Use descriptive commit messages** that reference the version
4. **Keep VERSION and package.json in sync**

