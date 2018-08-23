MediaWiki Time Travel
=====================

This is browser extension for Chromium-compatible browsers that enables user
to browse given MediaWiki site as it appeared at a given date in the past.

==================
Supported browsers
==================

MediaWiki Time Travel is developed and tested under Opera 55.0. It should work
without problem in newer versions and in reasonably older versions, too.
Other Chromium-based browsers (including Chromium itself)
are known to work as well, except:

- Vivaldi 1.15.1147.64 (extension doesn't appear in toolbar)

=====
Usage
=====

Download a .zip file from releases_ page and unpack to a convenient directory.
In your browser, open extensions settings and enable **developer mode**.
Select "Load unpacked extension" or similar option and point browser
to unpacked directory with ``manifest.json`` file in it.

Extension becomes active when you navigate to MediaWiki page, ie. Wikipedia.
Detection can sometimes fail - if you encounter such a case, please report it
as issue_.

=========
Copyright
=========

This software is distributed under the terms of GNU General Public License 3.0.
See ``LICENSE`` file for details.

Icons are derivative work of:

- MediaWiki logo by Klapaucjusz, available under public domain; `link <https://commons.wikimedia.org/wiki/File:MediaWiki-smaller-logo.png>`_
- Clock icon provided with Oxygen icon set, available under GNU Lesser General Public License 3.0 or later; `link <https://github.com/KDE/oxygen-icons>`_

.. _releases: https://github.com/hbielenia/mediawiki-time-travel/releases
.. _issue: https://github.com/hbielenia/mediawiki-time-travel/issues
