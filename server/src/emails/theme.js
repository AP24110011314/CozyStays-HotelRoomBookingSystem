export const EMAIL_THEME = {
  colors: {
    forest: '#1B4D3E',
    brass: '#C5A059',
    taupe: '#E5E0D8',
    charcoal: '#1A1818',
    ivory: '#FAF9F6',
  },
  layout: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
};

export function wrapEmailTemplate({ title, content, ctaLabel, ctaUrl, appName = 'CozyStays' }) {
  const { forest, brass, taupe, charcoal, ivory } = EMAIL_THEME.colors;
  const ctaButton = ctaUrl
    ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${ctaUrl}" style="background-color: ${brass}; color: ${charcoal}; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">
          ${ctaLabel || 'View Booking Details'}
        </a>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} | ${appName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${ivory}; font-family: ${EMAIL_THEME.layout.fontFamily}; color: ${charcoal}; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${ivory};">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid ${taupe}; border-radius: 12px; overflow: hidden;" cellspacing="0" cellpadding="0" border="0">
          <!-- Header Band in Forest Green -->
          <tr>
            <td style="background-color: ${forest}; padding: 24px 32px; text-align: left;">
              <span style="font-size: 22px; font-weight: 800; color: ${ivory}; letter-spacing: -0.5px;">
                Cozy<span style="color: ${brass};">Stays</span>
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: ${forest};">${title}</h1>
              ${content}
              ${ctaButton}
              <hr style="border: none; border-top: 1px solid ${taupe}; margin: 24px 0;" />
              <p style="margin: 0; font-size: 13px; color: #666666; text-align: center;">
                Warm regards,<br />
                <strong style="color: ${forest};">The CozyStays Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${ivory}; border-top: 1px solid ${taupe}; padding: 16px 32px; text-align: center; font-size: 12px; color: #888888;">
              &copy; ${new Date().getFullYear()} CozyStays. All rights reserved.<br />
              Boutique accommodations and memorable stays.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
