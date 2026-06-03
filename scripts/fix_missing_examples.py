#!/usr/bin/env python3
"""
Extrae y mejora ejemplos embebidos en desc, y escribe ejemplos nuevos
para las técnicas que no tenían ninguno. Modifica los tres idiomas.
"""
import json, re
from pathlib import Path

# ── Helpers ──────────────────────────────────────────────────────────────────

def load(lang):
    return json.loads(Path(f'data/{lang}/metac.json').read_text('utf-8'))

def save(lang, data):
    Path(f'data/{lang}/metac.json').write_text(
        json.dumps(data, ensure_ascii=False, indent=2), 'utf-8')
    print(f'  Escrito: data/{lang}/metac.json')

def patch(data, id_, *, desc=None, example=None):
    for item in data:
        if item['id'] == id_:
            if desc is not None:
                item['desc'] = desc
            if example is not None:
                item['example'] = example
            return
    raise KeyError(f'{id_} no encontrado')

def cut_at(desc, pattern):
    """Devuelve (antes, desde_patron). pattern puede ser str o regex."""
    m = re.search(pattern, desc)
    if not m:
        raise ValueError(f'Patrón no encontrado: {pattern!r}')
    return desc[:m.start()].rstrip(), desc[m.start():].strip()


# ══════════════════════════════════════════════════════════════════════════════
# ESPAÑOL
# ══════════════════════════════════════════════════════════════════════════════

def already_done(data, id_):
    item = next((x for x in data if x['id'] == id_), None)
    return item and bool(item.get('example'))

def fix_es():
    print('\n[es]')
    data = load('es')

    # ── metac_050 Juego de rol ────────────────────────────────────────────────
    if already_done(data, 'metac_050'):
        print('  metac_050 ya procesado, saltando')
    item = next(x for x in data if x['id'] == 'metac_050') if not already_done(data, 'metac_050') else None
    if item is None: item = next(x for x in data if x['id'] == 'metac_050')  # needed for flow below
    desc_clean, _ = cut_at(item['desc'], r'\nUn ejemplo de la técnica')
    patch(data, 'metac_050',
        desc=desc_clean,
        example=(
            '## Ejemplo\n\n'
            'En una clase de 4.º de ESO que estudia la Primera Guerra Mundial, '
            'el docente divide al grupo en tres bandos: representantes del Imperio '
            'austrohúngaro, del Imperio Británico y de Serbia. Cada equipo recibe una '
            'tarjeta de rol con la posición histórica de su país, sus alianzas y sus intereses.\n\n'
            'El reto: responder al asesinato del archiduque Francisco Fernando. Cada bando '
            'delibera internamente durante cinco minutos y formula su respuesta oficial. '
            'Después, en plenario, los representantes negocian, intentan evitar la escalada '
            'bélica y deben argumentar su posición con datos históricos reales.\n\n'
            'Al terminar, el docente presenta lo que ocurrió realmente y el grupo reflexiona '
            'sobre qué decisiones podrían haber cambiado el curso de la historia y por qué '
            'ningún bando las tomó.'
        )
    )

    # ── metac_064 Matriz de problemas ────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_064')
    desc_clean, _ = cut_at(item['desc'], r'\nEjemplo\n')
    patch(data, 'metac_064',
        desc=desc_clean,
        example=(
            '## Ejemplo\n\n'
            'En una clase de 3.º de ESO sobre hábitos de estudio, el docente plantea '
            'el problema: "¿Cómo podemos mejorar el rendimiento escolar?". Cada equipo '
            'propone soluciones y anticipa sus consecuencias en una tabla:\n\n'
            '| Solución | Efecto o consecuencia |\n'
            '|---|---|\n'
            '| Organizar mejor el tiempo | Mejora la gestión del tiempo y la concentración |\n'
            '| Estudiar en grupos | Mejora la comprensión y la resolución de dudas |\n'
            '| Descansar suficiente | Mejora la concentración y la memoria |\n'
            '| Alimentarse saludablemente | Mejora la concentración y la memoria |\n'
            '| Fijar objetivos | Mejora la motivación y la concentración |\n'
            '| Eliminar distracciones | Mejora la concentración |\n\n'
            'Una vez completada la matriz, los equipos comparan las opciones y justifican '
            'cuál consideran más factible para su situación concreta.'
        )
    )

    # ── metac_071 Parejas de detectives ──────────────────────────────────────
    patch(data, 'metac_071',
        example=(
            '## Ejemplo\n\n'
            'En una clase de 2.º de ESO que inicia la unidad de la Revolución Industrial, '
            'el docente plantea: "¿Por qué crees que los trabajadores de las fábricas del '
            'siglo XIX empezaron a organizarse colectivamente?"\n\n'
            'Cada alumno reflexiona en silencio y anota dos hipótesis posibles: por ejemplo, '
            '"porque las condiciones de trabajo eran pésimas" y "porque querían tener más poder '
            'frente a los propietarios". Después, en parejas, se preguntan mutuamente cuáles son '
            'sus hipótesis y las anotan sin debatir ni corregir.\n\n'
            'El docente recoge todas las hipótesis en la pizarra: aparecen ideas sobre salarios, '
            'jornadas laborales, solidaridad, presión económica... A continuación valora en voz '
            'alta la variedad de vías explicativas —sin decir todavía cuál es la correcta— y '
            'arranca la explicación de la unidad partiendo precisamente de esas hipótesis.'
        )
    )

    # ── metac_081 Puente 3 - 2 - 1 ───────────────────────────────────────────
    patch(data, 'metac_081',
        example=(
            '## Ejemplo\n\n'
            'En una clase de 5.º de Primaria que inicia una unidad sobre el agua y sus estados, '
            'el docente pide que cada alumno complete el puente antes de empezar.\n\n'
            '**Antes de la unidad** (alumna de ejemplo):\n'
            '- 3 ideas: agua, vapor, hielo\n'
            '- 2 preguntas: ¿Cómo se convierte el agua en vapor? / ¿Qué le pasa al agua cuando se congela?\n'
            '- 1 metáfora: el agua es como un actor que cambia de disfraz\n\n'
            '**Al terminar la unidad**, la misma alumna completa el puente de nuevo:\n'
            '- 3 ideas: evaporación, condensación, ciclo del agua\n'
            '- 2 preguntas: ¿Puede haber nieve en el desierto? / ¿Cuánta agua hay en la atmósfera?\n'
            '- 1 metáfora: el agua es como un viajero que nunca para de moverse\n\n'
            'En la puesta en común, explica qué ha cambiado en su forma de pensar y por qué. '
            'El docente usa las metáforas finales para identificar el nivel de comprensión '
            'alcanzado por cada estudiante.'
        )
    )

    # ── metac_085 Repartir puntos ─────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_085')
    desc_clean, _ = cut_at(item['desc'], r'\nPor ejemplo, si en un grupo')
    # Recuperar la parte "Esta técnica se utiliza..." y la fuente
    source_m = re.search(r'\nEsta técnica se utiliza', item['desc'])
    fuente_m = re.search(r'\nFuente:', item['desc'])
    tail = ''
    if source_m:
        tail = '\n\n' + item['desc'][source_m.start():].strip()
    patch(data, 'metac_085',
        desc=desc_clean + tail,
        example=(
            '## Ejemplo\n\n'
            'Un grupo de cuatro estudiantes entrega un trabajo conjunto valorado por el docente '
            'con un 7,5. En lugar de asignar directamente esa nota a todos, el docente les da '
            '7,5 × 4 = 30 puntos para que los repartan según la contribución de cada uno.\n\n'
            'El grupo debate y decide: alumna A recibe 8,5 (aportó el grueso del contenido), '
            'alumno B recibe 7,5 (coordinó el trabajo), alumna C recibe 7 (participó regularmente) '
            'y alumno D recibe 7 (con alguna ausencia en la fase de edición). La suma es 30 '
            'y la nota media es 7,5.\n\n'
            'El docente contrasta esta distribución con la Escala de valoración que el propio grupo '
            'rellenó antes de la corrección. Si coinciden, las notas quedan confirmadas; si hay '
            'discrepancias, se abre un espacio de reflexión sobre la co-responsabilidad en el '
            'trabajo en equipo.'
        )
    )

    # ── metac_089 Seguir la pista ─────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_089')
    # La demostración del profesor (pistas y preguntas) está en ## Desarrollo
    # Mantenemos la estructura ## Objetivo / ## Desarrollo pero quitamos el ejemplo incrustado
    # Extraemos todo desde la primera lista de pistas del profesor hasta el final de las preguntas
    desc_full = item['desc']
    # Cortar en el punto donde empieza la demostración del profesor (la lista de pistas)
    split_pat = r'\n  - Barcelona, dos,'
    before, _ = cut_at(desc_full, split_pat)
    # Reconstruir desc sin la demostración concreta pero con el procedimiento
    # La parte "Cada estudiante prepara seis pistas..." es procedimiento, no ejemplo
    # Encontramos donde empieza ese procedimiento
    proc_m = re.search(r'\n- Cada estudiante prepara seis pistas', desc_full)
    concl_m = re.search(r'\nConclusiones', desc_full)
    procedure_tail = ''
    if proc_m and concl_m:
        procedure_tail = '\n' + desc_full[proc_m.start()+1:concl_m.start()].strip()
        concl_tail = '\n\n' + desc_full[concl_m.start()+1:].strip()
    elif proc_m:
        procedure_tail = '\n' + desc_full[proc_m.start()+1:].strip()
        concl_tail = ''
    else:
        concl_tail = ''

    patch(data, 'metac_089',
        desc=before + '\n' + procedure_tail + concl_tail if procedure_tail else before + concl_tail,
        example=(
            '## Ejemplo\n\n'
            'El docente escribe en la pizarra sus propias pistas: '
            '_Barcelona, dos, 1950, camarero, once, leer, 2, sinceridad, San Petersburgo_.\n\n'
            'Los alumnos hacen preguntas cerradas (sí/no) para descifrarlas:\n'
            '- "¿Eres de Barcelona?" → No\n'
            '- "¿Estudiaste en Barcelona?" → Sí ✓\n'
            '- "¿El número dos tiene que ver con tus hijos?" → Sí ✓\n'
            '- "¿1950 es el año en que naciste?" → No\n'
            '- "¿Es el año en que nació alguien de tu familia?" → Sí ✓\n'
            '- "¿San Petersburgo es una ciudad que has visitado?" → Sí ✓\n\n'
            'Una vez descifradas las pistas del docente, cada estudiante prepara sus seis pistas '
            'y, en parejas, el compañero intenta descubrirlas con preguntas de sí/no. '
            'La sesión termina compartiendo en gran grupo las pistas más curiosas o difíciles de descifrar.'
        )
    )

    save('es', data)


# ══════════════════════════════════════════════════════════════════════════════
# CATALÀ
# ══════════════════════════════════════════════════════════════════════════════

def fix_ca():
    print('\n[ca]')
    data = load('ca')

    # ── metac_020 CO-OP CO-OP ─────────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_020')
    desc_clean, ex_raw = cut_at(item['desc'], r'\n---\n')
    # ex_raw té "---\n\n## Un exemple d'aplicació..."
    ex_clean = re.sub(r'^---\s*\n+', '', ex_raw).strip()
    # Normalitzar el títol
    ex_clean = re.sub(r'^## Un exemple[^\n]*', '## Exemple', ex_clean)
    patch(data, 'metac_020', desc=desc_clean, example=ex_clean)

    # ── metac_050 Joc de rol ──────────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_050')
    desc_clean, _ = cut_at(item['desc'], r'\nUn exemple de la tècnica')
    patch(data, 'metac_050',
        desc=desc_clean,
        example=(
            '## Exemple\n\n'
            'En una classe de 4t d\'ESO que estudia la Primera Guerra Mundial, el docent '
            'divideix el grup en tres bàndols: representants de l\'Imperi austrohongarès, '
            'de l\'Imperi Britànic i de Sèrbia. Cada equip rep una targeta de rol amb la '
            'posició històrica del seu país, les seves aliances i els seus interessos.\n\n'
            'El repte: respondre a l\'assassinat de l\'arxiduc Francesc Ferran. Cada bàndol '
            'delibera internament durant cinc minuts i formula la seva resposta oficial. '
            'Després, en plenari, els representants negocien, intenten evitar l\'escalada '
            'bèl·lica i han d\'argumentar la seva posició amb dades històriques reals.\n\n'
            'En acabar, el docent presenta el que va ocórrer realment i el grup reflexiona '
            'sobre quines decisions podrien haver canviat el curs de la història i per què '
            'cap bàndol les va prendre.'
        )
    )

    # ── metac_064 Matriu de problemes ─────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_064')
    desc_clean, _ = cut_at(item['desc'], r'\nExemple\n')
    patch(data, 'metac_064',
        desc=desc_clean,
        example=(
            '## Exemple\n\n'
            'En una classe de 3r d\'ESO sobre hàbits d\'estudi, el docent planteja el '
            'problema: "Com podem millorar el rendiment escolar?". Cada equip proposa '
            'solucions i n\'anticipa les conseqüències en una taula:\n\n'
            '| Solució | Efecte o conseqüència |\n'
            '|---|---|\n'
            '| Organitzar millor el temps | Millora la gestió del temps i la concentració |\n'
            '| Estudiar en grups | Millora la comprensió i la resolució de dubtes |\n'
            '| Descansar prou | Millora la concentració i la memòria |\n'
            '| Alimentar-se saludablement | Millora la concentració i la memòria |\n'
            '| Fixar objectius | Millora la motivació i la concentració |\n'
            '| Eliminar distraccions | Millora la concentració |\n\n'
            'Un cop completada la matriu, els equips comparen les opcions i justifiquen '
            'quina consideren més viable per a la seva situació concreta.'
        )
    )

    # ── metac_071 Parelles de detectius ──────────────────────────────────────
    patch(data, 'metac_071',
        example=(
            '## Exemple\n\n'
            'En una classe de 2n d\'ESO que inicia la unitat de la Revolució Industrial, '
            'el docent planteja: "Per què creus que els treballadors de les fàbriques del '
            'segle XIX van començar a organitzar-se col·lectivament?"\n\n'
            'Cada alumne reflexiona en silenci i anota dues hipòtesis possibles: per exemple, '
            '"perquè les condicions de treball eren pèssimes" i "perquè volien tenir més poder '
            'davant dels propietaris". Després, en parelles, es pregunten mútuament quines són '
            'les seves hipòtesis i les anoten sense debatre ni corregir.\n\n'
            'El docent recull totes les hipòtesis a la pissarra: apareixen idees sobre salaris, '
            'jornades laborals, solidaritat, pressió econòmica... A continuació valora en veu '
            'alta la varietat de vies explicatives —sense dir encara quina és la correcta— i '
            'comença l\'explicació de la unitat partint precisament d\'aquestes hipòtesis.'
        )
    )

    # ── metac_081 Pont 3 - 2 - 1 ─────────────────────────────────────────────
    patch(data, 'metac_081',
        example=(
            '## Exemple\n\n'
            'En una classe de 5è de Primària que inicia una unitat sobre l\'aigua i els seus '
            'estats, el docent demana que cada alumne completi el pont abans de començar.\n\n'
            '**Abans de la unitat** (alumna d\'exemple):\n'
            '- 3 idees: aigua, vapor, gel\n'
            '- 2 preguntes: Com es converteix l\'aigua en vapor? / Què li passa a l\'aigua quan es congela?\n'
            '- 1 metàfora: l\'aigua és com un actor que canvia de disfressa\n\n'
            '**En acabar la unitat**, la mateixa alumna completa el pont de nou:\n'
            '- 3 idees: evaporació, condensació, cicle de l\'aigua\n'
            '- 2 preguntes: Pot nevar al desert? / Quanta aigua hi ha a l\'atmosfera?\n'
            '- 1 metàfora: l\'aigua és com un viatger que no para mai de moure\'s\n\n'
            'En la posada en comú, explica què ha canviat en la seva manera de pensar i per '
            'què. El docent utilitza les metàfores finals per identificar el nivell de '
            'comprensió assolit per cada estudiant.'
        )
    )

    # ── metac_085 Repartir punts ──────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_085')
    desc_clean, _ = cut_at(item['desc'], r'\nPer exemple, si en un grup')
    source_m = re.search(r'\nAquesta tècnica s\'utilitza', item['desc'])
    tail = ('\n\n' + item['desc'][source_m.start():].strip()) if source_m else ''
    patch(data, 'metac_085',
        desc=desc_clean + tail,
        example=(
            '## Exemple\n\n'
            'Un grup de quatre estudiants entrega un treball conjunt valorat pel docent '
            'amb un 7,5. En lloc d\'assignar directament aquesta nota a tots, el docent '
            'els dona 7,5 × 4 = 30 punts perquè els reparteixin segons la contribució de cada un.\n\n'
            'El grup debat i decideix: l\'alumna A rep 8,5 (va aportar el gruix del contingut), '
            'l\'alumne B rep 7,5 (va coordinar el treball), l\'alumna C rep 7 (va participar '
            'regularment) i l\'alumne D rep 7 (amb alguna absència en la fase d\'edició). '
            'La suma és 30 i la nota mitjana és 7,5.\n\n'
            'El docent contrasta aquesta distribució amb l\'Escala de valoració que el propi '
            'grup va emplenar abans de la correcció. Si coincideixen, les notes queden '
            'confirmades; si hi ha discrepàncies, s\'obre un espai de reflexió sobre '
            'la co-responsabilitat en el treball en equip.'
        )
    )

    # ── metac_089 Seguir la pista ─────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_089')
    desc_full = item['desc']
    split_pat = r'\n  - Barcelona, dos,'
    before, _ = cut_at(desc_full, split_pat)
    proc_m = re.search(r'\n- Cada estudiant prepara sis pistes', desc_full)
    concl_m = re.search(r'\nConclusions', desc_full)
    procedure_tail = ''
    if proc_m and concl_m:
        procedure_tail = '\n' + desc_full[proc_m.start()+1:concl_m.start()].strip()
        concl_tail = '\n\n' + desc_full[concl_m.start()+1:].strip()
    elif proc_m:
        procedure_tail = '\n' + desc_full[proc_m.start()+1:].strip()
        concl_tail = ''
    else:
        concl_tail = ''
    patch(data, 'metac_089',
        desc=before + '\n' + procedure_tail + concl_tail if procedure_tail else before + concl_tail,
        example=(
            '## Exemple\n\n'
            'El docent escriu a la pissarra les seves pròpies pistes: '
            '_Barcelona, dos, 1950, cambrer, onze, llegir, 2, sinceritat, Sant Petersburg_.\n\n'
            'Els alumnes fan preguntes tancades (sí/no) per desxifrar-les:\n'
            '- "Ets de Barcelona?" → No\n'
            '- "Vas estudiar a Barcelona?" → Sí ✓\n'
            '- "El número dos té a veure amb els teus fills?" → Sí ✓\n'
            '- "1950 és l\'any en què vas néixer?" → No\n'
            '- "És l\'any en què va néixer algú de la teva família?" → Sí ✓\n'
            '- "Sant Petersburg és una ciutat que has visitat?" → Sí ✓\n\n'
            'Un cop desxifrades les pistes del docent, cada estudiant prepara les seves sis '
            'pistes i, en parelles, el company intenta descobrir-les amb preguntes de sí/no. '
            'La sessió acaba compartint en gran grup les pistes més curioses o difícils de desxifrar.'
        )
    )

    save('ca', data)


# ══════════════════════════════════════════════════════════════════════════════
# ENGLISH
# ══════════════════════════════════════════════════════════════════════════════

def fix_en():
    print('\n[en]')
    data = load('en')

    # ── metac_020 CO-OP CO-OP ─────────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_020')
    desc_clean, ex_raw = cut_at(item['desc'], r'\n---\n')
    ex_clean = re.sub(r'^---\s*\n+', '', ex_raw).strip()
    ex_clean = re.sub(r'^## An Example[^\n]*', '## Example', ex_clean)
    patch(data, 'metac_020', desc=desc_clean, example=ex_clean)

    # ── metac_034 5E Instructional Model ─────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_034')
    desc_clean, ex_raw = cut_at(item['desc'], r'\n## Complete example')
    ex_clean = re.sub(r'^## Complete example', '## Example', ex_raw.strip())
    patch(data, 'metac_034', desc=desc_clean, example=ex_clean)

    # ── metac_050 Role Play ───────────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_050')
    desc_clean, _ = cut_at(item['desc'], r'\nAn example of the role-playing')
    patch(data, 'metac_050',
        desc=desc_clean,
        example=(
            '## Example\n\n'
            'In a Year 10 class studying World War I, the teacher divides the group into '
            'three sides: representatives of the Austro-Hungarian Empire, the British Empire, '
            'and Serbia. Each team receives a role card with their country\'s historical position, '
            'alliances, and interests.\n\n'
            'The challenge: respond to the assassination of Archduke Franz Ferdinand. Each side '
            'deliberates internally for five minutes and formulates their official response. Then, '
            'in a plenary session, the representatives negotiate, try to prevent military escalation, '
            'and must argue their position using real historical data.\n\n'
            'At the end, the teacher presents what actually happened and the group reflects on '
            'which decisions could have changed the course of history and why none of the sides '
            'took them.'
        )
    )

    # ── metac_064 Problem Matrix ──────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_064')
    desc_clean, _ = cut_at(item['desc'], r'\nExample\n')
    patch(data, 'metac_064',
        desc=desc_clean,
        example=(
            '## Example\n\n'
            'In a Year 9 class on study habits, the teacher poses the problem: '
            '"How can we improve academic performance?" Each team proposes solutions and '
            'anticipates their consequences in a table:\n\n'
            '| Solution | Effect or consequence |\n'
            '|---|---|\n'
            '| Organise time better | Improves time management and concentration |\n'
            '| Study in groups | Improves comprehension and problem-solving |\n'
            '| Get enough rest | Improves concentration and memory |\n'
            '| Eat healthily | Improves concentration and memory |\n'
            '| Set goals | Improves motivation and concentration |\n'
            '| Eliminate distractions | Improves concentration |\n\n'
            'Once the matrix is complete, teams compare the options and justify which they '
            'consider most feasible for their specific situation.'
        )
    )

    # ── metac_071 Detective Pairs ─────────────────────────────────────────────
    patch(data, 'metac_071',
        example=(
            '## Example\n\n'
            'In a Year 8 class beginning a unit on the Industrial Revolution, the teacher asks: '
            '"Why do you think factory workers in the 19th century started to organise collectively?"\n\n'
            'Each student reflects silently and writes down two possible hypotheses — for example, '
            '"because working conditions were terrible" and "because they wanted more power against '
            'the owners." Students then pair up and ask each other about their hypotheses, writing '
            'them down without debating or correcting.\n\n'
            'The teacher collects all the hypotheses on the board: ideas about wages, working hours, '
            'solidarity, economic pressure… The teacher then comments on the range of explanations '
            '— without yet saying which is correct — and launches the unit\'s explanation starting '
            'from those very hypotheses.'
        )
    )

    # ── metac_081 3-2-1 Bridge ────────────────────────────────────────────────
    patch(data, 'metac_081',
        example=(
            '## Example\n\n'
            'In a Year 5 class beginning a unit on water and its states, the teacher asks each '
            'student to complete the bridge before starting.\n\n'
            '**Before the unit** (example student):\n'
            '- 3 ideas: water, steam, ice\n'
            '- 2 questions: How does water turn into steam? / What happens to water when it freezes?\n'
            '- 1 metaphor: Water is like an actor who changes costume\n\n'
            '**After the unit**, the same student completes the bridge again:\n'
            '- 3 ideas: evaporation, condensation, water cycle\n'
            '- 2 questions: Can it snow in the desert? / How much water is in the atmosphere?\n'
            '- 1 metaphor: Water is like a traveller who never stops moving\n\n'
            'In the class sharing session, the student explains what has changed in their thinking '
            'and why. The teacher uses the final metaphors to identify the level of understanding '
            'each student has reached.'
        )
    )

    # ── metac_085 Distribute Points ───────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_085')
    desc_clean, _ = cut_at(item['desc'], r'\nFor example, if a group of 4')
    source_m = re.search(r'\nThis technique is used with', item['desc'])
    tail = ('\n\n' + item['desc'][source_m.start():].strip()) if source_m else ''
    patch(data, 'metac_085',
        desc=desc_clean + tail,
        example=(
            '## Example\n\n'
            'A group of four students submits a joint project that the teacher grades 7.5 out of 10. '
            'Instead of giving everyone the same mark, the teacher gives them 7.5 × 4 = 30 points '
            'to distribute among themselves according to each member\'s contribution.\n\n'
            'The group discusses and decides: Student A gets 8.5 (provided the bulk of the content), '
            'Student B gets 7.5 (coordinated the work), Student C gets 7 (participated regularly), '
            'and Student D gets 7 (missed some of the editing phase). The total is 30 and the '
            'average is 7.5.\n\n'
            'The teacher compares this distribution with the rating scale the group filled in before '
            'the correction. If they match, the marks are confirmed; if there are discrepancies, '
            'a conversation opens about shared responsibility in teamwork.'
        )
    )

    # ── metac_089 Follow the trail ────────────────────────────────────────────
    item = next(x for x in data if x['id'] == 'metac_089')
    desc_full = item['desc']
    split_pat = r'\n- Barcelona'
    before, _ = cut_at(desc_full, split_pat)
    proc_m = re.search(r'\n- Each student prepares six', desc_full)
    concl_m = re.search(r'\nConclusions', desc_full)
    procedure_tail = ''
    if proc_m and concl_m:
        procedure_tail = '\n' + desc_full[proc_m.start()+1:concl_m.start()].strip()
        concl_tail = '\n\n' + desc_full[concl_m.start()+1:].strip()
    elif proc_m:
        procedure_tail = '\n' + desc_full[proc_m.start()+1:].strip()
        concl_tail = ''
    else:
        concl_tail = ''
    patch(data, 'metac_089',
        desc=before + '\n' + procedure_tail + concl_tail if procedure_tail else before + concl_tail,
        example=(
            '## Example\n\n'
            'The teacher writes their own clues on the board: '
            '_Barcelona, two, 1950, waiter, eleven, reading, 2, sincerity, St Petersburg_.\n\n'
            'Students ask yes/no questions to decipher them:\n'
            '- "Are you from Barcelona?" → No\n'
            '- "Did you study in Barcelona?" → Yes ✓\n'
            '- "Does the number two relate to your children?" → Yes ✓\n'
            '- "Is 1950 the year you were born?" → No\n'
            '- "Is it the year someone in your family was born?" → Yes ✓\n'
            '- "Is St Petersburg a city you have visited?" → Yes ✓\n\n'
            'Once the teacher\'s clues are decoded, each student prepares their own six clues '
            'and, in pairs, their partner tries to discover their meaning with yes/no questions. '
            'The session ends with the whole class sharing the most intriguing or tricky clues.'
        )
    )

    save('en', data)


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    fix_es()
    fix_ca()
    fix_en()
    print('\nHecho.')
