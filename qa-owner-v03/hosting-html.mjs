// Non-shipping integrity utility. Allow only this exact Cloudflare JSD wrapper;
// all other HTML and every executable/static asset must match the build.
import assert from 'node:assert/strict';
const template = "<script>(function(){function c(){var b=a.contentDocument||(a.contentWindow&&a.contentWindow.document);if(b){var d=b.createElement('script');d.innerHTML=\"window.__CF$cv$params={r:'__RAY__',t:'__TIME__'};var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);\";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>";
const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(escaped.replace('__RAY__', '[a-f0-9]{16}').replace('__TIME__', '[A-Za-z0-9+/=]+'), 'g');
export function normalizeHostedHtml(actual) {
  const additions = actual.match(pattern) || [];
  assert.ok(additions.length <= 1, 'Multiple hosting wrappers');
  return { html: actual.replace(pattern, ''), platformJsdWrappers: additions.length };
}
