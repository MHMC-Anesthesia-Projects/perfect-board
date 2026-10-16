/**
 * QGenda REST API Client & Connection Verification
 * Documentation reference: https://restapi.qgenda.com/
 * Live API Endpoint: https://api.qgenda.com/v2
 */

export interface QgendaAuthTestResult {
  success: boolean;
  message: string;
  error?: string;
  authenticatedEmail?: string;
  tokenExpiresIn?: string | number;
  company?: {
    name: string;
    key: string;
    location?: string;
    phone?: string;
  } | null;
  availableCompanies?: Array<{
    name: string;
    key: string;
  }>;
  companyKeyValidated?: boolean;
  keyStatusNote?: string;
}

/**
 * Normalizes user-supplied portal URL to standard QGenda REST API base URL.
 * restapi.qgenda.com is the Postman documentation site (hosted on CloudFront),
 * whereas api.qgenda.com is the live REST API host.
 */
export function normalizeQgendaBaseUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) return 'https://api.qgenda.com/v2';
  let u = rawUrl.trim().replace(/\/+$/, '');
  
  // Replace documentation domain with actual API domain
  u = u.replace('https://restapi.qgenda.com', 'https://api.qgenda.com');
  u = u.replace('http://restapi.qgenda.com', 'https://api.qgenda.com');
  
  if (!u.endsWith('/v2')) {
    u = `${u}/v2`;
  }
  return u;
}

/**
 * Tests authentication against QGenda's REST API and validates Company/API Key permissions.
 */
export async function testQgendaAuthentication(params: {
  email: string;
  password: string;
  companyKey?: string;
  portalUrl?: string;
}): Promise<QgendaAuthTestResult> {
  const email = (params.email || '').trim();
  const password = (params.password || '').trim();
  const rawCompanyKey = (params.companyKey || '').trim();

  if (!email || !password) {
    return {
      success: false,
      message: 'Email and password are required',
      error: 'Please enter your QGenda account email/username and password.'
    };
  }

  const baseUrl = normalizeQgendaBaseUrl(params.portalUrl);
  const loginUrl = `${baseUrl}/login`;

  try {
    // 1. Authenticate against QGenda REST API endpoint (POST /v2/login)
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        email,
        password
      }).toString()
    });

    const loginData = await loginRes.json().catch(() => null);

    if (!loginRes.ok || !loginData?.access_token) {
      const errMsg = loginData?.Message || 
                     loginData?.error_description || 
                     loginData?.error || 
                     (loginRes.status === 401 ? 'Invalid email or password' : `HTTP ${loginRes.status}: Authentication failed`);
      return {
        success: false,
        message: 'Authentication failed',
        error: errMsg
      };
    }

    const token = loginData.access_token;
    const tokenType = loginData.token_type || 'bearer';
    const expiresIn = loginData.expires_in;

    // 2. Query /v2/company to inspect available companies for this authenticated user
    let companies: Array<{ CompanyName: string; CompanyKey: string; CompanyLocation?: string; CompanyPhoneNumber?: string }> = [];
    let matchedCompany: { name: string; key: string; location?: string; phone?: string } | null = null;

    try {
      const companyRes = await fetch(`${baseUrl}/company`, {
        method: 'GET',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Accept': 'application/json'
        }
      });

      if (companyRes.ok) {
        const compData = await companyRes.json().catch(() => []);
        if (Array.isArray(compData)) {
          companies = compData;
          if (companies.length > 0) {
            // Find company matching the user-entered companyKey (if any)
            const found = rawCompanyKey 
              ? companies.find(c => (c.CompanyKey || '').toLowerCase() === rawCompanyKey.toLowerCase())
              : null;
            
            const target = found || companies[0];
            matchedCompany = {
              name: target.CompanyName || 'QGenda Organization',
              key: target.CompanyKey || rawCompanyKey,
              location: target.CompanyLocation,
              phone: target.CompanyPhoneNumber
            };
          }
        }
      }
    } catch {
      // Non-fatal if company endpoint check encounters an issue
    }

    // 3. Verify Company Key with an active read query if provided or discovered
    const testKey = rawCompanyKey || matchedCompany?.key;
    let keyValidated = false;
    let keyStatusNote = '';

    if (testKey) {
      try {
        // Query location endpoint with companyKey and limit=1
        const testRes = await fetch(`${baseUrl}/location?companyKey=${encodeURIComponent(testKey)}&$top=1`, {
          method: 'GET',
          headers: {
            'Authorization': `${tokenType} ${token}`,
            'Accept': 'application/json'
          }
        });

        if (testRes.ok) {
          keyValidated = true;
          keyStatusNote = 'API Company Key verified and active with full schedule/location access.';
        } else if (testRes.status === 401 || testRes.status === 403) {
          keyStatusNote = `Company Key rejected (HTTP ${testRes.status}). Verify this key has API permissions enabled in QGenda.`;
        } else {
          // Some setups don't have location permissions but have schedule permissions; test schedule
          const today = new Date();
          const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
          const schedRes = await fetch(`${baseUrl}/schedule?companyKey=${encodeURIComponent(testKey)}&startDate=${dateStr}&endDate=${dateStr}&$top=1`, {
            method: 'GET',
            headers: {
              'Authorization': `${tokenType} ${token}`,
              'Accept': 'application/json'
            }
          });
          if (schedRes.ok) {
            keyValidated = true;
            keyStatusNote = 'API Company Key verified and active with schedule access.';
          } else {
            keyStatusNote = `Company Key check returned HTTP ${schedRes.status}.`;
          }
        }
      } catch (keyErr: any) {
        keyStatusNote = `Company Key verification error: ${keyErr.message}`;
      }
    } else {
      keyStatusNote = 'No Company Key provided. Authenticated using user login.';
    }

    return {
      success: true,
      message: 'QGenda REST API connection verified successfully! Access token acquired.',
      authenticatedEmail: email,
      tokenExpiresIn: expiresIn,
      company: matchedCompany,
      availableCompanies: companies.map(c => ({
        name: c.CompanyName,
        key: c.CompanyKey
      })),
      companyKeyValidated: keyValidated,
      keyStatusNote
    };
  } catch (netErr: any) {
    return {
      success: false,
      message: 'Connection failed',
      error: `Network error connecting to QGenda (${loginUrl}): ${netErr.message || String(netErr)}`
    };
  }
}
