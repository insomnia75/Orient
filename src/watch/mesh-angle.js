/**
 * Pure maths, kept free of three.js so pages that only draw gears (SVG) never load it.
 * Rotation of a child gear that meshes with its parent, so teeth interlock at every angle.
 * `phi` is the direction (radians, CCW from +X) from the parent's centre to the child's.
 * Tooth 0 of every gear is centred on angle 0.
 */
export function meshAngle(parentRot, parentTeeth, childTeeth, phi) {
  return phi + Math.PI - Math.PI / childTeeth - ((parentRot - phi) * parentTeeth) / childTeeth;
}
