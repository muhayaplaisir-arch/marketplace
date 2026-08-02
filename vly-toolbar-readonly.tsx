// DO NOT MODIFY THIS FILE. THIS FILE IS READ-ONLY. CONTAINS ALL KEY APP FUNCTIONALITY.

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MousePointer, ExternalLink, AlertTriangle } from "lucide-react";

import { snapdom } from "@zumer/snapdom";

// FiberNode and ComponentInfo interfaces
export interface FiberNode {
  displayName?: string;
  name?: string;
  tag: number;
  type: unknown;
  return: FiberNode | null;
  _debugOwner?: {
    name: string;
    env: string;
  };
}

const FunctionComponent = 0;
const ClassComponent = 1;
const HostComponent = 5;

export interface ComponentInfo {
  name: string;
  type: "regular" | "rsc";
}

export function getReactComponentHierarchy(
  element: HTMLElement | null,
): ComponentInfo[] | null {
  if (!element) {
    return null;
  }

  const components: ComponentInfo[] = [];
  const maxComponents = 3;

  // Find the internal React Fiber node key.
  const fiberKey = Object.keys(element).find(
    (key) =>
      key.startsWith("__reactFiber$") ||
      key.startsWith("__reactInternalInstance$"),
  );

  if (!fiberKey) {
    return null;
  }

  let currentFiber: FiberNode | null = (
    element as unknown as Record<string, unknown>
  )[fiberKey] as FiberNode | null;

  if (!currentFiber) {
    return null;
  }

  // Traverse up the Fiber tree.
  while (currentFiber && components.length < maxComponents) {
    let componentData: ComponentInfo | null = null;

    if (
      currentFiber.tag === ClassComponent ||
      currentFiber.tag === FunctionComponent
    ) {
      const componentDefinition = currentFiber.type;
      if (componentDefinition) {
        const def = componentDefinition as {
          displayName?: string;
          name?: string;
        };
        const name =
          def.displayName ||
          def.name ||
          currentFiber._debugOwner?.name ||
          "AnonymousComponent";
        componentData = { name, type: "regular" };
      }
    } else if (
      currentFiber.tag === HostComponent &&
      currentFiber._debugOwner &&
      currentFiber._debugOwner.env?.toLowerCase().includes("server")
    ) {
      componentData = { name: currentFiber._debugOwner.name, type: "rsc" };
    }

    if (componentData) {
      const alreadyExists = components.some(
        (c) => c.name === componentData!.name && c.type === componentData!.type,
      );
      if (!alreadyExists) {
        components.push(componentData);
      }
    }
    currentFiber = currentFiber.return;
  }

  return components.length > 0 ? components : null;
}

export function formatReactComponentHierarchy(
  hierarchy: ComponentInfo[] | null,
): string {
  if (!hierarchy || hierarchy.length === 0) {
    return "No React components found for this element.";
  }

  const parts = hierarchy.map(
    (info) => `{name: ${info.name}, type: ${info.type}}`,
  );

  let description = `React component tree (from closest to farthest, ${hierarchy.length} closest element${hierarchy.length > 1 ? "s" : ""}): `;
  description += parts.join(" child of ");

  return description;
}

export function getSelectedElementAnnotation(element: HTMLElement) {
  const hierarchy = getReactComponentHierarchy(element);
  if (hierarchy?.[0]) {
    return {
      annotation: `${hierarchy[0].name}${hierarchy[0].type === "rsc" ? " (RSC)" : ""}`,
    };
  }
  return { annotation: null };
}

export function g

[FILE_TOO_LARGE]: The combined read_files output exceeded the 100 000 character hard limit. This file was truncated after 3 429 characters. Read it separately or use code_search for the relevant section.