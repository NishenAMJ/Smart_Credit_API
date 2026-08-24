/** @format */

import React from "react";
import { RefreshControl, RefreshControlProps } from "react-native";
import { COLORS } from "../../constants/colors";

type BorrowerRefreshControlProps = Pick<
  RefreshControlProps,
  "refreshing" | "onRefresh" | "progressViewOffset" | "enabled"
>;

/** Consistent pull-to-refresh treatment for all borrower data screens. */
export default function BorrowerRefreshControl(
  props: BorrowerRefreshControlProps,
) {
  return (
    <RefreshControl
      {...props}
      tintColor={COLORS.primary}
      colors={[COLORS.primary]}
      progressBackgroundColor={COLORS.surface}
      title="Updating…"
      titleColor={COLORS.textSecondary}
    />
  );
}
