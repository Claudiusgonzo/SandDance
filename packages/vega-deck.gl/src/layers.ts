// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { concat } from './array';
import { base } from './base';
import { layerNames } from './constants';
import { CubeLayer, CubeLayerInterpolatedProps, CubeLayerProps } from './cube-layer/cube-layer';
import { LinearInterpolator_Class } from './deck.gl-classes/linearInterpolator';
import {
    Cube,
    PresenterConfig,
    Stage,
    StyledLine,
    VegaTextLayerDatum,
    Path,
    Polygon
} from './interfaces';
import { Presenter } from './presenter';
import { RGBAColor } from '@deck.gl/core/utils/color';
import { DeckProps } from '@deck.gl/core/lib/deck';
import { InterpolationTransitionTiming } from '@deck.gl/core/lib/layer';
import { easeExpInOut } from 'd3-ease';
import { Layer, Position3D } from 'deck.gl';
import { TextLayerProps } from '@deck.gl/layers/text-layer/text-layer';
import { min3dDepth } from './defaults';
import { DeckBase } from './exports/types';

export function getLayers(
    presenter: Presenter,
    config: PresenterConfig,
    stage: Stage,
    lightSettings: any /*LightSettings*/,
    lightingMix: number,
    interpolator: LinearInterpolator_Class<CubeLayerInterpolatedProps>,
    guideLines: StyledLine[]
): Layer<any>[] {
    const cubeLayer = newCubeLayer(presenter, config, stage.cubeData, presenter.style.highlightColor, lightSettings, lightingMix, interpolator);
    const { x, y } = stage.axes;
    const lines = concat(stage.gridLines, guideLines);
    const texts = [...stage.textData];
    [x, y].forEach(axes => {
        axes.forEach(axis => {
            if (axis.domain) lines.push(axis.domain);
            if (axis.ticks) lines.push.apply(lines, axis.ticks);
            if (axis.tickText) texts.push.apply(texts, axis.tickText);
            if (axis.title) texts.push(axis.title);
        });
    });
    if (stage.facets) {
        stage.facets.forEach(f => {
            if (f.lines) lines.push.apply(lines, f.lines);
        });
    }
    const lineLayer = newLineLayer(layerNames.lines, lines);
    const textLayer = newTextLayer(presenter, layerNames.text, texts, config, presenter.style.fontFamily);
    const pathLayer = newPathLayer(layerNames.paths, stage.pathData);
    const polygonLayer = newPolygonLayer(layerNames.polygons, stage.polygonData);
    return [textLayer, cubeLayer, lineLayer, pathLayer, polygonLayer];
}

function newCubeLayer(presenter: Presenter, config: PresenterConfig, cubeData: Cube[], highlightColor: RGBAColor, lightSettings: any /*LightSettings*/, lightingMix: number, interpolator?: LinearInterpolator_Class<CubeLayerInterpolatedProps>) {
    const getPosition = getTiming(config.transitionDurations.position, easeExpInOut);
    const getSize = getTiming(config.transitionDurations.size, easeExpInOut);
    const getColor = getTiming(config.transitionDurations.color);
    const cubeLayerProps: CubeLayerProps = {
        interpolator,
        lightingMix,
        id: layerNames.cubes,
        data: cubeData,
        coordinateSystem: base.deck.COORDINATE_SYSTEM.CARTESIAN,
        pickable: true,
        autoHighlight: true,
        highlightColor,
        onClick: (o, e) => {
            config.onCubeClick(e && e.srcEvent, o.object as Cube);
        },
        onHover: (o, e) => {
            if (o.index === -1) {
                presenter.deckgl.interactiveState.onCube = false;
                config.onCubeHover(e && e.srcEvent, null);
            } else {
                presenter.deckgl.interactiveState.onCube = true;
                config.onCubeHover(e && e.srcEvent, o.object as Cube);
            }
        },
        //lightSettings,
        transitions: {
            getPosition,
            getColor,
            getSize
        }
    };
    return new CubeLayer(cubeLayerProps);
}

function newLineLayer(id: string, data: StyledLine[]) {
    return new base.layers.LineLayer({
        id,
        data,
        widthUnits: 'pixels',
        coordinateSystem: base.deck.COORDINATE_SYSTEM.CARTESIAN,
        getColor: (o: StyledLine) => o.color,
        getWidth: (o: StyledLine) => o.strokeWidth
    });
}


function newPathLayer(id: string, mdata: Path[]) {
    if (!mdata) return null;

    const idata = mdata.map((p) => {
        return ({
            path: p.positions,
            name: 'id',
            strokeColor: p.strokeColor,
            strokeWidth: p.strokeWidth
        })
    });

    return new base.layers.PathLayer<any>({
        id,
        data: idata,
        billboard: true,
        widthScale: 1,
        widthMinPixels: 2,
        widthUnits: 'pixels',
        coordinateSystem: base.deck.COORDINATE_SYSTEM.CARTESIAN,
        getPath: (o) => o.path,
        getColor: (o) => o.strokeColor,
        getWidth: (o) => o.strokeWidth
    });
}

function newPolygonLayer(id: string, data: Polygon[]) {
    if (!data) return null;

    let newlayer = new base.layers.PolygonLayer<Polygon>({
        id,
        data,
        coordinateSystem: base.deck.COORDINATE_SYSTEM.CARTESIAN,
        getPolygon: (o) => o.positions,
        getFillColor: (o) => o.fillColor,
        getLineColor: (o) => o.strokeColor,
        wireframe: false,
        filled: true,
        stroked: true,
        pickable: true,
        extruded: true,
        getElevation: (o) => o.depth,
        getLineWidth: (o) => o.strokeWidth
    });
    return newlayer;
}

function newTextLayer(presenter: Presenter, id: string, data: VegaTextLayerDatum[], config: PresenterConfig, fontFamily: string) {
    const props: TextLayerProps<VegaTextLayerDatum> = {
        id,
        data,
        coordinateSystem: base.deck.COORDINATE_SYSTEM.CARTESIAN,
        sizeUnits: 'pixels',
        autoHighlight: true,
        pickable: true,
        highlightColor: p => {
            if (config.getTextHighlightColor) {
                return config.getTextHighlightColor(p.object);
            } else {
                return [0, 0, 0, 0];
            }
        },
        onClick: (o, e) => {
            let pe: Partial<PointerEvent> = e && e.srcEvent;
            config.onTextClick && config.onTextClick(pe as PointerEvent, o.object as VegaTextLayerDatum);
        },
        onHover: (o, e) => {
            if (o.index === -1) {
                presenter.deckgl.interactiveState.onText = false;
            } else {
                presenter.deckgl.interactiveState.onText = config.onTextHover ? config.onTextHover(e && e.srcEvent, o.object as VegaTextLayerDatum) : true;
            }
        },
        getColor: config.getTextColor || (o => o.color),
        getTextAnchor: o => o.textAnchor,
        getSize: o => o.size,
        getAngle: o => o.angle,
        fontSettings: {
            sdf: true,
            fontSize: 128,
            buffer: 3
        }
    };
    if (fontFamily) {
        props.fontFamily = fontFamily;
    }
    return new base.layers.TextLayer(props);
}

function getTiming(duration: number, easing?: (t: number) => number) {
    let timing: InterpolationTransitionTiming;
    if (duration) {
        timing = {
            duration,
            type: 'interpolation'
        };
        if (easing) {
            timing.easing = easing;
        }
    }
    return timing;
}

export function getCubeLayer(deckProps: Partial<DeckProps>) {
    return deckProps.layers.filter(layer => layer && layer.id === layerNames.cubes)[0];
}

export function getCubes(deckProps: Partial<DeckProps>) {
    const cubeLayer = getCubeLayer(deckProps);
    if (!cubeLayer) return;
    const cubeLayerProps = cubeLayer.props as CubeLayerProps;
    return cubeLayerProps.data as Cube[];
}
