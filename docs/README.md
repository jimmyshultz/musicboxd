# Resonare Legal Documents - GitHub Pages

This directory contains the legal documents for Resonare, hosted on GitHub Pages.

## 📄 Files

- `index.html` - Privacy Policy page
- `terms.html` - Terms of Service page
- `guidelines.html` - Community Guidelines page
- `styles.css` - Responsive, modern CSS styling
- `README.md` - This file

## 🔗 Live URLs

- **Privacy Policy:** https://jimmyshultz.github.io/musicboxd/
- **Terms of Service:** https://jimmyshultz.github.io/musicboxd/terms.html
- **Community Guidelines:** https://jimmyshultz.github.io/musicboxd/guidelines.html

## 🚀 GitHub Pages Setup

### Initial Setup

1. **Enable GitHub Pages**
   - Go to your repository settings on GitHub
   - Navigate to **Settings** > **Pages**
   - Under "Source", select **main** branch
   - Select **/docs** folder
   - Click **Save**
   - Wait 1-2 minutes for deployment

2. **Verify Deployment**
   - GitHub will provide your site URL (e.g., `https://jimmyshultz.github.io/musicboxd/`)
   - Click the link to verify the privacy policy page loads correctly
   - Ensure HTTPS is enabled (required by Apple App Store)

3. **Test on Mobile**
   - Open the URL on an iOS device
   - Verify the page is responsive and readable
   - Check that all sections display correctly

## 🔗 Live URL

Once deployed, your privacy policy will be available at:
```
https://[your-github-username].github.io/musicboxd/
```

Or with the full path:
```
https://[your-github-username].github.io/musicboxd/index.html
```

## 📱 Apple App Store Integration

### Where to Add the Privacy Policy URL

1. **App Store Connect**
   - Log in to [App Store Connect](https://appstoreconnect.apple.com/)
   - Select your app
   - Go to **App Information**
   - Add the privacy policy URL in the **Privacy Policy URL** field

2. **App Privacy Details**
   - In App Store Connect, go to **App Privacy**
   - Complete the privacy questionnaire
   - Ensure it matches the information in the privacy policy

3. **Optional: In-App Link**
   - Add a link to the privacy policy in your app's Settings screen
   - Also consider adding it to the authentication flow

## ✏️ Updating the Privacy Policy

When you need to update the privacy policy:

1. **Edit the HTML file**
   ```bash
   # Edit the file
   vim docs/index.html  # or use your preferred editor
   ```

2. **Update the "Last Updated" date**
   - Find the line with `<p class="last-updated">Last Updated: ...</p>`
   - Change the date to the current date

3. **Commit and push changes**
   ```bash
   git add docs/index.html
   git commit -m "Update privacy policy"
   git push origin main
   ```

4. **Wait for deployment**
   - GitHub Pages will automatically rebuild (takes 1-2 minutes)
   - Verify changes are live by visiting the URL

## 📧 Contact Email

**Important:** Make sure to update the contact email in `index.html` before going live:

- Find: `privacy@resonare.app`
- Replace with your actual privacy contact email address

## ✅ Pre-Launch Checklist

Before submitting to the App Store, verify:

- [ ] Privacy policy URL is publicly accessible
- [ ] HTTPS is enabled (green lock icon in browser)
- [ ] Page loads correctly on mobile devices (iOS)
- [ ] Contact email is correct and active
- [ ] "Last Updated" date is accurate
- [ ] All sections accurately reflect your data practices
- [ ] Third-party service links work correctly
- [ ] No placeholder text remains

## 🎨 Customization

### Updating Styles

To customize the appearance:

1. Edit `styles.css`
2. Modify CSS variables at the top of the file:
   ```css
   :root {
       --primary-color: #6200ee;  /* Change to your app's primary color */
       --accent-color: #03dac6;   /* Change to your app's accent color */
   }
   ```

### Dark Mode

The privacy policy automatically supports dark mode based on user preferences. No additional configuration needed.

## 🔍 Testing

### Browser Testing

Test in these browsers to ensure compatibility:
- Safari (iOS and macOS)
- Chrome
- Firefox
- Edge

### Mobile Testing

Test on actual iOS devices:
- iPhone (various sizes)
- iPad
- Test in both portrait and landscape orientations

### Accessibility Testing

- Test with VoiceOver (iOS) or screen readers
- Ensure all links are keyboard accessible
- Verify color contrast meets WCAG AA standards

## 📝 Version History

Track changes to your privacy policy using Git:

```bash
# View history
git log docs/index.html

# View specific change
git show <commit-hash>
```

## 🆘 Troubleshooting

### Page Not Loading

1. Check GitHub Pages settings are correct
2. Ensure the `docs/` folder is on the `main` branch
3. Wait 5 minutes and try again (deployment can take time)
4. Check GitHub Actions tab for deployment status

### 404 Error

1. Verify the files are in the `docs/` folder at repository root
2. Check file names are exactly `index.html` and `styles.css`
3. Ensure GitHub Pages is enabled and set to serve from `/docs`

### Styling Not Working

1. Verify `styles.css` is in the same directory as `index.html`
2. Check the `<link>` tag in `index.html` is correct
3. Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

## 📚 Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Privacy Details on App Store](https://developer.apple.com/app-store/app-privacy-details/)

---

**Last Updated:** December 7, 2025
