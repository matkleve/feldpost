# Widget install

Pure rule for which addable apps the left nav shows. The facade reads `organization_widget_policies` and `user_widget_installs` through `SupabaseService`.

`effectiveWidgetIds` in `widget-install.helpers.ts` is the rule. The database does not delete subject rows when a widget is off.

Contract: `docs/specs/system/widget-install.md`.
