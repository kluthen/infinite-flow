---
id: entity_remembered_controller_record
status: DRAFT
type: ENTITY
version: 0.2
human_name: Remembered-Controller Record
parents:
  - [[module_on_device_database]]
  - [[rule_controller_attached_definition]]
  - [[rule_delete_everything]]
  - [[rule_disconnect_forgets_controller]]
  - [[rule_last_controller_remembered]]
  - [[rule_same_controller_reattaches]]
layer: ARCHITECTURE
priority: 1
tags: [v3, release-v3.0, storage, midi]
dependents: []
---

# Remembered-Controller Record

## INTENT
Keep on the device the one fact needed to reselect the player's last controller at load, its input port's identity, matched the same way a controller that comes back within a page is recognised, never by its name.

## THE RULE / LOGIC
Shape. The remembered controller is one record in the on-device database's controller store, in the record envelope with its two versions. It holds the input port's `id`, the one identity the app matches a controller on, the same identity by which a device that comes back within a page is recognised; and the port's `name` and `manufacturer`, for display only. The name and the manufacturer are never matched on, since two identical devices share them.

Lifetime. The record is written, through the save policy, when a device counts as connected. The player's Disconnect clears it. An unplugged controller leaves it untouched, as does deleting My instrument. Delete everything removes it with the rest of the database. In a visit that saves nothing (an outdated tab, or a visit started from the defaults because the saved data could not be read), the record is neither written nor cleared: a controller connected there is not remembered, and the player's Disconnect forgets the controller for that visit only, so the next load that reads the saved data reselects the controller remembered before.

Matching at load. The record is read from the remembered-controller records the saved-data load already gives. Only when a controller is remembered and the browser's permission query says MIDI access is already granted is MIDI access requested, once, a request that cannot prompt. The input whose `id` equals the record's is then attached, at once if it is present or when it appears, as a device that comes back within a page is reattached: no connection step and no transposition check. Any other input is never picked up this way, whatever its name. With nothing remembered, or with the permission not already granted, nothing is requested.

A device whose `id` does not survive a reload is not reselected; it is never matched by name instead.

## TECHNICAL INTERFACE
src/storage/records/controller-record.ts holds the record's shape, with RecordVersions from src/storage/record-envelope.ts, in the controller store of the on-device database (module_on_device_database); the store already exists and no data version is added. The saved-data load reads it with the port's readAll('controller') and hands it as SavedDataLoad.rememberedController (src/storage-bootstrap.ts, module_saved_data_loader). The identity is the Web MIDI input port's `id`, the same one src/midi/midi-controller.ts compares when a selected device reappears; the load path's access request goes through src/midi/web-midi-access.ts, and src/components/workspace/use-controller-connection.ts receives the loaded record and a saver of it that writes through the save policy. Function names and signatures are left to the implementation.

## EXPECTATION
- The controller store holds at most one remembered-controller record, in the record envelope, holding the input port's id, name and manufacturer.
- The record is written when a device counts as connected and removed by Disconnect; an unplug and deleting My instrument leave it; Delete everything removes it.
- With permission already granted and the remembered device present, a reload attaches it with no prompt path taken; with permission not granted, nothing is requested.
- A different device with the same name and manufacturer is never attached by the record.
- In an outdated tab and in a visit started from the defaults, connecting a controller and Disconnect write and delete nothing; the next load that reads the saved data reselects the controller remembered before.
