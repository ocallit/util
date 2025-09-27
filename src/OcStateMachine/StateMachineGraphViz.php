<?php
declare(strict_types=1);

namespace ocallit\Util\OcStateMachine;

class StateMachineGraphViz {
    protected StateMachine $stateMachine;
    protected string $title;
    protected string $notes;
    protected string $rankdir = 'LR';
    protected bool $markCurrent = TRUE;

    public function __construct(StateMachine $stateMachine, string $title = '', string $notes = '') {
        $this->stateMachine = $stateMachine;
        $this->title = $title;
        $this->notes = $notes;
    }

    public function setVertical(bool $vertical): self {
        $this->rankdir = $vertical ? 'TB' : 'LR';
        return $this;
    }

    public function setMarkCurrent(bool $mark): self {
        $this->markCurrent = $mark;
        return $this;
    }

    public function generate(): string {
        $states = $this->stateMachine->getStates();
        $current = $this->stateMachine->getCurrentState();

        $moveToGuard = $this->stateMachine->getMoveToGuard();
        $onBefore = $this->stateMachine->getOnBeforeTransition();
        $onAfter = $this->stateMachine->getOnAfterTransition();

        $now = (new \DateTimeImmutable())->format('d/M/y H:i');
        $out = "digraph G {\n";
        $out .= "  graph [rankdir={$this->rankdir}, labelloc=\"t\", fontsize=12, label=" . $this->qAttr("$this->title\n$now") . ", nodesep=0.35, ranksep=0.6];\n";
        $out .= "  node  [shape=record, fontname=\"Segoe UI\", fontsize=12];\n";
        $out .= "  edge  [fontname=\"Segoe UI\", fontsize=11];\n\n";

        // legend
        if($this->notes !== '' || $moveToGuard || $onBefore || $onAfter) {
            $legend = "Legend:\\l- GUARD_* = conditions\\l- ON_* = triggers\\l";
            if($moveToGuard) $legend .= "\\lGlobal moveToGuard: " . $this->fmtList($moveToGuard) . "\\l";
            if($onBefore) $legend .= "\\lGlobal onBeforeTransition: " . $this->fmtList($onBefore) . "\\l";
            if($onAfter) $legend .= "\\lGlobal onAfterTransition: " . $this->fmtList($onAfter) . "\\l";
            if($this->notes) $legend .= "\\lNotes: " . str_replace(["\r\n", "\n", "\r"], "\\l", $this->notes) . "\\l";
            $out .= "  subgraph cluster_legend { label=\"\"; color=\"#ddd\"; style=\"rounded\";\n";
            $out .= "    legend [shape=box, style=\"rounded\", label=" . $this->q($legend) . "];\n";
            $out .= "  }\n\n";
        }

        // states
        foreach($states as $sid => $cfg) {
            $label = $cfg[StateMachine::LABEL] ?? (string)$sid;
            $guardsEnter = $this->fmtList($cfg[StateMachine::GUARD_ENTER] ?? []);
            $guardsLeave = $this->fmtList($cfg[StateMachine::GUARD_LEAVE] ?? []);
            $onEnter = $this->fmtList($cfg[StateMachine::ON_ENTER] ?? []);
            $onLeave = $this->fmtList($cfg[StateMachine::ON_LEAVE] ?? []);

            $onTransLines = [];
            foreach(($cfg[StateMachine::TRANSITION_TO] ?? []) as $toId => $edge) {
                $onTrans = $edge[StateMachine::ON_TRANSITION] ?? [];
                if($onTrans) {
                    $onTransLines[] = "▶ ON_TRANSITION→{$toId}(): " . $this->fmtList($onTrans);
                }
            }
            $trigBlock = "ON_ENTER(): $onEnter | ON_LEAVE(): $onLeave";
            if($onTransLines) $trigBlock .= " | " . implode(" | ", $onTransLines);

            $fill = ($this->markCurrent && $sid === $current) ? ', style="filled", fillcolor="#FFF3B0"' : '';
            $out .= "  " . $this->id((string)$sid) . " [label=" .
              $this->q("{" . $this->esc($label) . "|{<guards> GUARD_ENTER: $guardsEnter | GUARD_LEAVE: $guardsLeave}|{<trig> $trigBlock}}") .
              $fill . "];\n";
        }
        $out .= "\n";

        // edges
        foreach($states as $from => $cfg) {
            foreach(($cfg[StateMachine::TRANSITION_TO] ?? []) as $to => $edge) {
                $edgeLabel = $edge[StateMachine::LABEL] ?? ($from . " → " . $to);
                $guardTrans = $this->fmtList($edge[StateMachine::GUARD_TRANSITION] ?? []);
                if($guardTrans !== "[]") $edgeLabel .= "\\nGUARD_TRANSITION: $guardTrans";
                $out .= "  " . $this->id((string)$from) . " -> " . $this->id((string)$to) .
                  " [label=" . $this->q($edgeLabel) . "];\n";
            }
        }

        $out .= "}\n";
        return $out;
    }

    // helpers

    protected function fmtList(array $arr): string {
        if(!$arr) return "[]";
        $parts = [];
        foreach($arr as $cb) $parts[] = $this->callableName($cb);
        return "[ " . implode(", ", $parts) . " ]";
    }

    protected function callableName($cb): string {
        if(is_string($cb)) return $cb;
        if(is_array($cb) && count($cb) === 2) {
            [$o, $m] = $cb;
            $left = is_object($o) ? get_class($o) : (string)$o;
            return $left . '::' . $m;
        }
        if($cb instanceof \Closure) return 'inline Func';
        return 'callable';
    }

    protected function id(string $s): string {
        return 'S' . preg_replace('/[^A-Za-z0-9_]/', '_', $s);
    }

    protected function q(string $s): string {
        return '"' . addcslashes($s, "\"\\") . '"';
    }

    protected function qAttr(string $s): string {
        $s = str_replace(["\r\n", "\r"], "\n", $s);
        $s = str_replace("\n", "\\n", $s);
        return '"' . addcslashes($s, "\"\\") . '"';
    }

    protected function esc(string $s): string {
        return str_replace(['{', '}', '|'], ['\\{', '\\}', '\\|'], $s);
    }
}
