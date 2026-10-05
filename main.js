(function () {
  var btn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  function setOpen(open) {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { setOpen(!menu.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

  document.getElementById('year').textContent = new Date().getFullYear();

  // The contact form has no backend: it builds a pre-filled email to info@realevr.com.
  var form = document.getElementById('contact-form');
  var note = form.querySelector('.form-note');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    form.querySelectorAll('[required]').forEach(function (el) {
      var bad = !el.value.trim();
      el.setAttribute('aria-invalid', String(bad));
      if (bad) ok = false;
    });
    if (!ok) { note.textContent = 'Please add your name and a phone number or email.'; return; }
    var d = new FormData(form);
    var subject = 'Website enquiry: ' + d.get('need');
    var body = 'Name: ' + d.get('name') + '\nContact: ' + d.get('reply') +
      '\nLooking to: ' + d.get('need') + '\n\n' + (d.get('message') || '');
    window.location.href = 'mailto:info@realevr.com?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    note.textContent = 'Opening your email app… If nothing happens, email info@realevr.com or call +256 702 742 333.';
  });
})();
