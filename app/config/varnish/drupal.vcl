vcl 4.0;

backend default {
  .host = "APPSERVERIP";    # IP or Hostname of backend
  .port = "80";           # Port Apache or whatever is listening
}

sub vcl_recv {

  # Return (pass) instructs Varnish not to cache the request
  # when the condition is met.

  ## ADMIN PAGES ##

  # Here we filter out all URLs containing Drupal administrative sections
  if (req.url ~ "^/status\.php$" ||
    req.url ~ "^/update\.php$" ||
    req.url ~ "^/admin$" ||
    req.url ~ "^/admin/.*$" ||
    req.url ~ "^/user$" ||
    req.url ~ "^/user/.*$" ||
    req.url ~ "^/flag/.*$" ||
    req.url ~ "^.*/ajax/.*$" ||
    req.url ~ "^.*/ahah/.*$") {
      return (pass);
  }

  ## BACKUP AND MIGRATE MODULE ##

  # Backup and Migrate is a very popular Drupal module that needs to be excluded
  # It won't work with Varnish
  if (req.url ~ "^/admin/content/backup_migrate/export") {
    return (pipe);
  }

  ## COOKIES ##

  # Remove cookies for stylesheets, scripts, and images used throughout the site.
  # Removing cookies will allow Varnish to cache those files.
  if (req.url ~ "(?i)\.(css|js|jpg|jpeg|gif|png|ico)(\?.*)?$") {
    unset req.http.Cookie;
  }

  # Remove all cookies that are not necessary for Drupal to work properly.
  # Since it would be cumbersome to REMOVE certain cookies, we specify
  # which ones are of interest to us, and remove all others. In this particular
  # case we leave SESS, SSESS and NO_CACHE cookies used by Drupal's administrative
  # interface. Cookies in cookie header are delimited with ";", so when there are
  # many cookies, the header looks like "Cookie1=value1; Cookie2=value2; Cookie3..."
  # and so on. That allows us to work with ";" to split cookies into individual
  # ones.
  #
  # The method for filtering unnecessary cookies has been adopted from:
  # https://fourkitchens.atlassian.net/wiki/display/TECH/Configure+Varnish+3+for+Drupal+7
  if (req.http.Cookie) {
    # 1. We add ; to the beginning of cookie header
    set req.http.Cookie = ";" + req.http.Cookie;
    # 2. We remove spaces following each occurence of ";". After this operation
    # all cookies are delimited with no spaces.
    set req.http.Cookie = regsuball(req.http.Cookie, "; +", ";");
    # 3. We replace ";" INTO "; " (adding the space we have previously removed) in cookies
    # named SESS..., SSESS... and NO_CACHE. After this operation those cookies will be
    # easy to differentiate from the others, because those will be the only one with space
    # after ";"
    set req.http.Cookie = regsuball(req.http.Cookie, ";(SESS[a-z0-9]+|SSESS[a-z0-9]+|NO_CACHE)=", "; \1=");
    # 4. We remove all cookies with no space after ";", so basically we remove all cookies other
    # than those above.
    set req.http.Cookie = regsuball(req.http.Cookie, ";[^ ][^;]*", "");
    # 5. We strip leading and trailing whitespace and semicolons.
    set req.http.Cookie = regsuball(req.http.Cookie, "^[; ]+|[; ]+$", "");

    # If there are no cookies after our striping procedure, we remove the header altogether,
    # thus allowing Varnish to cache this page
    if (req.http.Cookie == "") {
      unset req.http.Cookie;
    }
    # if any of our cookies of interest are still there, we disable caching and pass the request
    # straight to Apache and Drupal
    else {
      return (pass);
    }
  }
}

sub vcl_backend_response {
  # Remove cookies for stylesheets, scripts and images used throughout the site.
  # Removing cookies will allow Varnish to cache those files. It is uncommon for
  # static files to contain cookies, but it is possible for files generated
  # dynamically by Drupal. Those cookies are unnecessary, but could prevent files
  # from being cached.
  if (bereq.url ~ "(?i)\.(css|js|jpg|jpeg|gif|png|ico)(\?.*)?$") {
    unset beresp.http.set-cookie;
  }
}
