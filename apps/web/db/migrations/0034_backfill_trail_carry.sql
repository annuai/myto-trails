-- What to carry and when to arrive, for the four trails that were published before those fields existed.
--
-- Basis, so a reader can judge it (nothing here is an official instruction):
--   * Water, items and notes are suggestions drawn from each trail's own recorded conditions (length, duration, terrain, hazards,
--     safety notes). No source lists items to carry for these places.
--   * Best time to reach comes from published visitor guidance where it exists: Manchanabele (listings give about 6 AM to 6 PM
--     and say mornings are quieter) and Hesaraghatta (a visitor blog suggests 5:30 to 9 AM). Opening hours were inconsistent
--     between sources and no official hours were found, so both notes say so. Bettahalasuru and Thippagondanahalli have no
--     usable source, so their arrival window stays empty rather than guessed.
-- Only fields that are still empty are filled, so a value a moderator has since entered is never overwritten. A database
-- without these trails is unaffected.

update trail_revision r set
  water_litres = 1.5,
  carry = array['offline_map', 'first_aid', 'sun_protection'],
  carry_notes = 'Suggested from the conditions described above, not an official list. There is little shade on the open granite, and the way in is hard to find, so keep a recorded track to follow back.'
from trail t
where t.slug = 'bettahalasuru-lake' and r.id = t.published_revision_id and r.water_litres is null and r.carry = '{}' and r.carry_notes is null;

update trail_revision r set
  water_litres = 1.5,
  carry = array['offline_map', 'tow_strap', 'first_aid', 'sun_protection'],
  carry_notes = 'Suggested from the conditions described above, not an official list. Deep mud and standing water are likely after rain, so ride with a friend and take a way to pull a bike out.',
  arrival_from_min = 360,
  arrival_to_min = 540,
  arrival_note = 'A visitor blog suggests early morning (about 5:30 to 9 AM) for cooler air and birds. No official hours were found.'
from trail t
where t.slug = 'hesarghatta-wetlands' and r.id = t.published_revision_id and r.water_litres is null and r.carry = '{}' and r.carry_notes is null and r.arrival_from_min is null;

update trail_revision r set
  water_litres = 2.0,
  carry = array['puncture_kit', 'tyre_inflator', 'first_aid', 'sun_protection', 'snacks'],
  carry_notes = 'Suggested from the conditions described above, not an official list. It is about 37 km from Bengaluru with no facilities on the trails.',
  arrival_from_min = 360,
  arrival_to_min = 480,
  arrival_note = 'Most listings give about 6 AM to 6 PM and say mornings are quieter, but the sources disagree on hours. Check locally.'
from trail t
where t.slug = 'manchanabele-dam' and r.id = t.published_revision_id and r.water_litres is null and r.carry = '{}' and r.carry_notes is null and r.arrival_from_min is null;

update trail_revision r set
  water_litres = 1.0,
  carry = array['offline_map', 'sun_protection'],
  carry_notes = 'Suggested from the conditions described above, not an official list. Entry to the reservoir has been described as restricted, so check before you go.'
from trail t
where t.slug = 'thippagondanahalli-reservoir' and r.id = t.published_revision_id and r.water_litres is null and r.carry = '{}' and r.carry_notes is null;
